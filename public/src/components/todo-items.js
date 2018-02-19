import CompostMixin from '../../../node_modules/@lamplightdev/compost/src/compost-mixin.js';
import CompostRepeatMixin from '../../../node_modules/@lamplightdev/compost/src/repeat-mixin.js';

import './todo-item.js';

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

  updateItem(el, value, index) {
    el.item = value;
    el.index = index;
  }
}

customElements.define('todo-items', TodoItems);
