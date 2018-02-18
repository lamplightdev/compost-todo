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
