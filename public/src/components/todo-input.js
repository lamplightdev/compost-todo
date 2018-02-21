import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';
import './todo-input.js';
import './todo-items.js';

class TodoInput extends CompostMixin(HTMLElement) {
  render() {
    return `
      <style>
        #new-todo-form {
            position: relative;
            font-size: 24px;
            border-bottom: 1px solid #ededed;
        }
        #new-todo {
            padding: 16px 16px 16px 60px;
            border: none;
            background: rgba(0, 0, 0, 0.003);
            position: relative;
            margin: 0;
            width: 100%;
            font-size: 24px;
            font-family: inherit;
            font-weight: inherit;
            line-height: 1.4em;
            border: 0;
            outline: none;
            color: inherit;
            padding: 6px;
            border: 1px solid #CCC;
            box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
        }
      </style>

      <form id="new-todo-form" on-submit="add">
        <input id="new-todo" type="text" name="text" placeholder="What needs to be done?">
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
