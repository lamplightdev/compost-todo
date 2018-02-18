import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';
import './todo-input.js';
import './todo-items.js';

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
