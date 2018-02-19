import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';

class TodoItem extends CompostMixin(HTMLElement) {
  static get properties() {
    return {
      item: {
        type: Object,
        value: {},
        observer: 'observeItem',
      },

      index: {
        type: Number,
        value: 0,
      },
    };
  }

  render() {
    return `
      <style>
        .done {
          text-decoration: line-through;
        }
      </style>
      <div>
        <input id="done" type="checkbox" on-change="toggleDone">
        <label id="label"></label>
        <button on-click="remove">x</button>
      </div>
    `;
  }

  observeItem(oldValue, newValue) {
    this.$id.label.textContent = newValue.text;

    this.$id.done.checked = newValue.done;
    if (newValue.done) {
      this.$id.label.classList.add('done');
    } else {
      this.$id.label.classList.remove('done');
    }
  }

  toggleDone() {
    this.fire('todo-toggle', {
      index: this.index,
    });
  }

  remove() {
    this.fire('todo-remove', {
      index: this.index,
    });
  }
}

customElements.define('todo-item', TodoItem);
