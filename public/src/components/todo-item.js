import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';

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
