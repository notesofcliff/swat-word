// utils/format-commands.js

export function execCommand(editor, cmd, value) {
  if (!editor) return;

  // Focus the editor
  editor.focus();

  // Try document.execCommand first
  let success = false;
  try {
    success = document.execCommand(cmd, false, value);
  } catch (e) {
    // Fallback to Range-based operations
  }

  if (!success) {
    // Fallback implementations
    switch (cmd) {
      case 'bold':
        wrapSelection(editor, 'strong');
        break;
      case 'italic':
        wrapSelection(editor, 'em');
        break;
      case 'underline':
        wrapSelection(editor, 'u');
        break;
      case 'justifyLeft':
        setAlignment(editor, 'left');
        break;
      case 'justifyCenter':
        setAlignment(editor, 'center');
        break;
      case 'justifyRight':
        setAlignment(editor, 'right');
        break;
      case 'justifyFull':
        setAlignment(editor, 'justify');
        break;
      case 'insertUnorderedList':
        insertList(editor, 'ul');
        break;
      case 'insertOrderedList':
        insertList(editor, 'ol');
        break;
      default:
        console.warn('Unsupported command:', cmd);
    }
  }
}

function wrapSelection(editor, tagName) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return;

  const element = document.createElement(tagName);
  element.textContent = selectedText;
  range.deleteContents();
  range.insertNode(element);

  // Move cursor after
  range.setStartAfter(element);
  range.setEndAfter(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setAlignment(editor, align) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  let element = range.commonAncestorContainer;
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement;
  }

  // Find paragraph or create one
  while (element && element !== editor && element.tagName !== 'P' && element.tagName !== 'DIV') {
    element = element.parentElement;
  }

  if (element && element !== editor) {
    element.style.textAlign = align;
  }
}

function insertList(editor, listType) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const list = document.createElement(listType);
  const li = document.createElement('li');
  li.textContent = range.toString() || 'List item';
  list.appendChild(li);

  range.deleteContents();
  range.insertNode(list);

  // Move cursor
  range.setStart(li, 1);
  range.setEnd(li, 1);
  selection.removeAllRanges();
  selection.addRange(range);
}