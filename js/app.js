(function () {
'use strict';

/**
 * Base class for other shadow mixins
 *
 * Attaches shadow root to current element, adds some helper properties
 * and adds method to initialise the shadow toot (implemented by sub classes)
 */

const CompostShadowBaseMixin = parent => (
  class extends parent {
    constructor() {
      super();

      this.attachShadow({ mode: 'open' });

      this.initialRender();

      this.$s = this.shadowRoot;
      this.$ = this.$s.querySelector.bind(this.$s);
      this.$$ = this.$s.querySelectorAll.bind(this.$s);

      // keep a map of all elements with ids
      this.$id = {};

      this.$$('[id]').forEach((el) => {
        this.$id[el.id] = el;
      });
    }

    // called once when element is initialised
    initialRender() {}

    // called on subsequent renders, if necessary
    invalidate() {}
  }
);

/**
 * A mixin to initialise the shadow root with a template formed from a string
 */

// cache templates
const templateCache = {};

const CompostShadowMixin = parent => (
  class extends CompostShadowBaseMixin(parent) {

    /**
     * return the template string to be rendered
     */
    render() {
      return '';
    }

    initialRender() {
      let template;

      if (templateCache[this.tagName]) {
        template = templateCache[this.tagName];
      } else {
        // create template element from string
        const templateString = this.render();
        template = document.createElement('template');
        template.innerHTML = templateString;

        // if no native shadow dom and polyfill included, use it
        if (window.ShadyCSS && !window.ShadyCSS.nativeShadow) {
          window.ShadyCSS.prepareTemplate(template, this.nodeName.toLowerCase());
          window.ShadyCSS.styleElement(this);
        }

        templateCache[this.tagName] = template;
      }

      const instance = template.content.cloneNode(true);

      this.shadowRoot.appendChild(instance);
    }

    // no data binding, so invalidate is a no-op
    invalidate() {}
  }
);

/**
 * Polymer inspired Custom Element property mixin
 * to allow definition of property types and observers
 */


/*
 * Stack to hold the currently waiting observers.
 * Observers get processed FIFO, and the current stack
 * is processed in it's entirety at the end of each task
 * as a microtask (deferred using a promise)
 *
 * This means the order in which properties are set in a task
 * doesn't matter as each observer will have access to the latest
 * values of each property
 */
const setStack = [];

// whether or not the stack is currently being processed
let loopPaused = true;

// the loop to empty the setStack
const runLoop = () => {
  loopPaused = false;

  while (setStack.length > 0) {
    const item = setStack.pop();

    // only call observer if the value has changed
    // (the value may have been set multiple times)
    if (item.oldValue !== item.newValue) {
      item.component[item.observer](item.oldValue, item.newValue);
    }
  }

  loopPaused = true;
};

const CompostPropertiesMixin = parent => (
  class extends parent {
    /**
     * this holds the properties of the element
     *
     * returns an object keyed by the property name
     *
     * each property is an object containing:
     *
     * type: the Javascript type of the property
     *  one of: String, Number, Boolean, Array, Object
     *
     * value (optional): the default value the property should take
     *  otherwise undefined
     *
     * observer (optional): a method on the element that should be called
     *  when the property changes - takes oldValue, newValue as args
     *
     * reflectToAttribute (optional): if true when the property changes, it's
     *  value will set as an attribute on the element with the same name.
     *  camelCased property names are converted to kebab-case
     *
     *
     * Note: on initialisation of the element, any attribute with the same
     * name as a property (kebab-case -> camelCase) will be set as the initial
     * property value, overriding the default value from above
     */
    static get properties() {
      return {};
    }

    static get observedAttributes() {
      // Observe attributes for all defined properties
      return Object.keys(this.properties)
        .map(propName => this.propertyNameToAttributeName(propName));
    }

    constructor() {
      super();

      /**
       * if the element has already been connected to the DOM, so we don't
       * run initialisation more than once
       */
      this._connected = false;

      /**
       * an object to hold the current property values
       */
      this._props = {};

      /**
       * a map of property names to attribute names
       */
      this._propsToAttrs = {};

      /**
       * a map of attribute names to property names
       */
      this._attrsToProps = {};

      /**
       * which attributes we should ignore on next attributeChangedCallback
       * to prevent infinite loops
       */
      this._ignoreNextAttributeChange = {};

      Object.keys(this.constructor.properties).forEach((propName) => {
        const attributeName = this.constructor.propertyNameToAttributeName(propName);

        this._propsToAttrs[propName] = attributeName;
        this._attrsToProps[attributeName] = propName;
      });
    }

    static propertyNameToAttributeName(propName) {
      return propName.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
    }

    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      // don't run if we've already defined the properties
      if (!this._connected) {
        Object.keys(this.constructor.properties).forEach((propName) => {
          const attributeName = this._propsToAttrs[propName];

          // initial property value is either that already set on the element
          // or the default value it's been given
          const initialValue = Object.prototype.hasOwnProperty.call(this, propName)
            ? this[propName] : this.constructor.properties[propName].value;

          // remove the current property
          delete this[propName];

          // define setters and getters for the properties
          Object.defineProperty(this, propName, {
            get: () => this._props[propName],
            set: (value) => { this.set(propName, value); },
          });

          // set the property value either as the initial value, or if there is
          // an attribute set, to the attribute value
          if (!this.hasAttribute(attributeName)) {
            this[propName] = initialValue;
          } else {
            this.attributeChangedCallback(
              attributeName,
              undefined,
              this.getAttribute(attributeName),
            );
          }
        });

        this._connected = true;
      }
    }

    attributeChangedCallback(name, oldValue, newValue) {
      const propName = this._attrsToProps[name];

      if (!this._ignoreNextAttributeChange[name]) {
        // format property according to type
        switch (this.constructor.properties[propName].type) {
          case Number:
            this[propName] = Number(newValue);
            break;
          case Boolean:
            this[propName] = newValue !== null;
            break;
          case Array: case Object:
            this[propName] = JSON.parse(newValue);
            break;
          default:
            this[propName] = newValue;
            break;
        }
      }

      this._ignoreNextAttributeChange[name] = false;
    }

    /**
     * The setter for the properties
     */
    set(propName, value) {
      // keep ahold of the current value;
      let oldValue = this._props[propName];

      switch (this.constructor.properties[propName].type) {
        case Number:
          // Number(null) === 0, but we want to allow nulls
          this._props[propName] = value === null ? null : Number(value);
          break;
        default:
          this._props[propName] = value;
          break;
      }

      // if property has changed
      if (oldValue !== this[propName]) {
        if (this.constructor.properties[propName].reflectToAttribute) {
          const attributeName = this._propsToAttrs[propName];

          // Remove the attribute if new value is null
          if (this[propName] === null) {
            this.removeAttribute(attributeName);
          } else {
            switch (this.constructor.properties[propName].type) {
              case Boolean:
                if (this[propName]) {
                  // ignore the next attribute changed callback otherwise
                  // there'll be an infinite loop
                  this._ignoreNextAttributeChange[attributeName] = true;

                  // a truthy value sets the attribute to an empty string
                  this.setAttribute(attributeName, '');
                } else {
                  // a falsey value removes the attribute
                  this.removeAttribute(attributeName);
                }
                break;
              case Array: case Object:
                // ignore the next attribute changed callback otherwise
                // there'll be an infinite loop
                this._ignoreNextAttributeChange[attributeName] = true;
                this.setAttribute(attributeName, JSON.stringify(this[propName]));
                break;
              default:
                // ignore the next attribute changed callback otherwise
                // there'll be an infinite loop
                this._ignoreNextAttributeChange[attributeName] = true;
                this.setAttribute(attributeName, this[propName]);
                break;
            }
          }
        }

        // if this property is observed
        if (this.constructor.properties[propName].observer) {

          // check to see if this property has been changed already in this task
          const existingItemIndex = setStack.findIndex(item => (
            item.component === this && item.propName === propName
          ));

          // if it has already been changed
          if (existingItemIndex > -1) {
            // find where in stack the previous changed is queued
            const existingItem = setStack[existingItemIndex];
            // remove it
            setStack.splice(existingItemIndex, 1);
            // keep the oldValue as the original property value
            oldValue = existingItem.oldValue;
          }

          // put the observer on the stack to call later
          setStack.unshift({
            component: this,
            propName,
            observer: this.constructor.properties[propName].observer,
            oldValue,
            newValue: this[propName],
          });

          if (loopPaused) {
            // wait until microtasks are run
            Promise.resolve().then(() => {
              if (loopPaused) {
                loopPaused = false;
                // process stack
                runLoop();
              }
            });
          }
        }
      }
    }
  }
);

/**
 * Mixin for adding event binding to the shadow DOM
 */

const CompostEventsMixin = parent => (
  class extends parent {
    /**
     * a list of event types that can be bound
     */
    static get eventTypes() {
      return ['abort', 'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextmenu', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended', 'error', 'focus', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize', 'scroll', 'seeked', 'seeking', 'select', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'wheel', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'beforecopy', 'beforecut', 'beforepaste', 'copy', 'cut', 'paste', 'search', 'selectstart'];
    }

    constructor() {
      super();

      // holds bound events so they can be unbound
      this._boundEvents = [];
    }

    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      if (this.shadowRoot) {
        this.constructor.eventTypes.forEach((eventType) => {
          const attr = `on-${eventType}`;

          this.shadowRoot.querySelectorAll(`[${attr}]`).forEach((el) => {
            const event = {
              el,
              eventType,
              fn: this[el.getAttribute(attr)].bind(this),
            };

            this.on(el, eventType, event.fn);

            this._boundEvents.push(event);
          });
        });
      }
    }

    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }

      this._boundEvents.forEach((boundEvent) => {
        this.off(boundEvent.el, boundEvent.eventType, boundEvent.fn);
      });
    }

    /**
     * bind a listener (func) to el
     */
    on(el, type, func) {
      el.addEventListener(type, func);
    }

    /**
     * unbind a listener (func) from el
     */
    off(el, type, func) {
      el.removeEventListener(type, func);
    }

    /**
     * fire a custom event
     */
    fire(type, detail, bubbles = true, composed = true) {
      this.dispatchEvent(new CustomEvent(type, {
        bubbles,
        composed,
        detail,
      }));
    }
  }
);

/**
 * Convenience mixin containing the 3 main Compost mixins
 *
 */
const CompostMixin = parent => (
  class extends
    CompostEventsMixin(CompostPropertiesMixin(CompostShadowMixin(parent))) {}
);

/**
 * A mixin to stamp out a template from an array property (items)
 *
 * (pretty experimental and inefficient currently I think!)
 */

// cache for template elememts
const templateCache$1 = {};

const CompostRepeatMixin = parent => (
  class extends parent {
    static get properties() {
      return {
        // the property from which the elements will be bound to
        items: {
          type: Array,
          value: [],
          observer: 'observeItems',
        },
      };
    }

    render(staticTemplateString) {
      // the elements will be added to the light DOM (slot)
      return `
        ${staticTemplateString}
        <slot></slot>
      `;
    }

    /**
     * The template string to use for the value at items[index] (value)
     */
    getTemplateString(value, index) {
      return '<div></div>';
    }

    /**
     * Create a template element from a string
     */
    createTemplate(templateString) {
      const template = document.createElement('template');
      template.innerHTML = templateString;

      return template;
    }

    /**
     * a unique key for each element
     */
    getKey(value, index) {
      return index;
    }

    /**
     * how to initialise the element each time it's value changes
     */
    updateItem(el, value, index) {}


    /**
     * stamp out a new element
     */
    _createItem(value, index) {
      const templateString = this.getTemplateString(value, index);
      let template;

      if (templateCache$1[templateString]) {
        template = templateCache$1[templateString];
      } else {
        template = this.createTemplate(templateString);
        templateCache$1[templateString] = template;
      }

      const instance = template.content.cloneNode(true);

      // get first non-text node of instance

      // const el = instance.children[0];
      // above doesn't work on IE11
      const el = [...instance.childNodes]
        .filter(node => node.nodeType === Node.ELEMENT_NODE)[0];

      // set key
      el.key = this.getKey(value, index);

      return el;
    }

    /**
     * Update elements when items changes
     */
    observeItems(oldValues, values) {
      let existingElements = this.$('slot').assignedNodes();

      // add keys as sub properties on all items
      const keyedValues = values.map((value, index) => (
        Object.assign({}, value, {
          key: this.getKey(value, index),
        })
      ));

      const newKeys = keyedValues.map(value => value.key);
      const existingKeys = existingElements.map(el => el.key);

      // remove items that have no matching key in items
      existingKeys.forEach((existingKey) => {
        if (newKeys.indexOf(existingKey) === -1) {
          const el = existingElements.find(existingEl => existingEl.key === existingKey);
          this.removeChild(el);
        }
      });

      // get existing elements after any removals
      existingElements = this.$('slot').assignedNodes();

      // get or create elements for each value in items
      const orderedElements = [];

      newKeys.forEach((newKey) => {
        const index = keyedValues.findIndex(value => value.key === newKey);

        let el;
        // if no matching key, create new element else get existing
        if (existingKeys.indexOf(newKey) === -1) {
          el = this._createItem(values[index], index);
        } else {
          el = existingElements.find(existingEl => existingEl.key === newKey);
        }

        orderedElements.push(el);
      });

      // for each item, update element if needed
      orderedElements.forEach((newChild, index) => {
        const existingChild = existingElements[index];

        if (existingChild) {
          // if there's a new value at this index
          if (newChild.key !== existingChild.key) {
            // insert new element at this index, keeping old element
            this.insertBefore(newChild, existingChild);
          }
        } else {
          // add new element to end of current list

          // Browsers using the webcomponents polyfill do no upgrade custom
          // elements when using appendChild(?) on this. Appending to body,
          // and then attaching to this seems to work.
          document.querySelector('body').appendChild(newChild);
          this.appendChild(newChild);
        }

        // update the item
        this.updateItem(newChild, values[index], index);

        existingElements = this.$('slot').assignedNodes();
      });
    }
  }
);

class TodoItem extends CompostMixin(HTMLElement) {
  static get properties() {
    return {
      item: {
        type: Object,
        value: {},
        observer: 'observeItem',
      },
    };
  }

  render() {
    return `
      <div>
        <input type="checkbox" on-change="toggleDone">
        <label></label>
        <button on-click="remove">x</button>
      </div>
    `;
  }

  observeItem(oldValue, newValue) {
    this.$s.querySelector('label').textContent
      = `${newValue.text} (${newValue.done ? '' : 'not '}done)`;

    this.$s.querySelector('input').checked = newValue.done;
  }

  toggleDone() {
    this.fire('todo-toggle', {
      id: this.item.id,
    });
  }

  remove() {
    this.fire('todo-remove', {
      id: this.item.id,
    });
  }
}

customElements.define('todo-item', TodoItem);

class TodoItems extends CompostRepeatMixin(CompostMixin(HTMLElement)) {
  render() {
    return super.render(`
    `);
  }

  getTemplateString() {
    return '<todo-item></todo-item>';
  }

  getKey(value, index) {
    return index;
  }

  updateItem(el, value) {
    el.item = value;
  }
}

customElements.define('todo-items', TodoItems);

class TodoInput extends CompostMixin(HTMLElement) {
  render() {
    return `
      <form on-submit="add">
        <input type="text" name="text" placeholder="Add">
      </form>
    `;
  }

  add(event) {
    event.preventDefault();

    const input = event.target.text;
    const text = input.value.trim();

    if (text) {
      this.fire('todo-add', {
        text,
      });

      input.value = '';
    }
  }
}

customElements.define('todo-input', TodoInput);

class MyTodo extends CompostMixin(HTMLElement) {
  static get properties() {
    return {
      items: {
        type: Array,
        value: [],
        observer: 'observeItems',
      },

      count: {
        type: Number,
        value: 2,
      },
    };
  }

  render() {
    return `
    <h1>Todos WC</h1>
    <section>
      <todo-input></todo-input>
      <todo-items id="todo-items"></todo-items>
    </section>
    `;
  }

  constructor() {
    super();

    this.addItem = this.addItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.toggleItem = this.toggleItem.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    this.on(this, 'todo-add', this.addItem);
    this.on(this, 'todo-remove', this.removeItem);
    this.on(this, 'todo-toggle', this.toggleItem);
  }

  observeItems(oldValue, newValue) {
    this.$id['todo-items'].items = newValue;
  }

  addItem(event) {
    this.count += 1;
    this.items = this.items.slice();
    this.items.push({
      id: this.count - 1,
      text: event.detail.text,
      done: false,
    });
  }

  removeItem(event) {
    const id = event.detail.id;

    this.items = this.items.slice();
    const index = this.items.findIndex(item => item.id === id);
    this.items.splice(index, 1);
  }

  toggleItem(event) {
    const id = event.detail.id;

    this.items = this.items.slice();
    const index = this.items.findIndex(item => item.id === id);
    this.items[index] = {
      ...this.items[index],
      done: !this.items[index].done,
    };
  }
}

customElements.define('my-todo', MyTodo);

}());
//# sourceMappingURL=app.js.map
