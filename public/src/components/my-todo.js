import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';
import './todo-input.js';
import './todo-items.js';

class MyTodo extends CompostMixin(HTMLElement) {
  static get properties() {
    return {
      items: {
        type: Array,
        value: [],
        observer: 'observeItems',
      },
    };
  }

  render() {
    return `
    <style>
      h1 {
          font-size: 100px;
          font-weight: 100;
          text-align: center;
          color: rgba(175, 47, 47, 0.15);
      }
      section {
          background: #fff;
          margin: 130px 0 40px 0;
          position: relative;
          box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
      }

      todo-items {
          margin: 0;
          padding: 0;
          list-style: none;
          border-top: 1px solid #e6e6e6;
      }
    </style>
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
    this.items = this.items.slice();
    this.items.push({
      text: event.detail.text,
      done: event.detail.done,
    });
  }

  removeItem(event) {
    const index = event.detail.index;

    this.items = this.items.slice();
    this.items.splice(index, 1);
  }

  toggleItem(event) {
    const index = event.detail.index;

    this.items = this.items.slice();
    this.items[index] = {
      ...this.items[index],
      done: !this.items[index].done,
    };
  }
}

customElements.define('my-todo', MyTodo);
