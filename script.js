"use strict";
const demo = [{ "image": "url", "fullname": "Name", "hometown": "Address", "purpose": "Reason", "category": "urgent/important/norush/emergency" }];

let timerId = null;
let toastTimerId = null;
let index;
let onAcceptCallback;
let method = 'json';

const local = (key = 'tasks', onUpdate = () => { }) => ({
  get() {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    }
    catch {
      return [];
    }
  },
  save(data) {
    localStorage.setItem(key, JSON.stringify(data));
    onUpdate(data);
  },
  add(obj) {
    let oldTasks = this.get();
    this.save([...oldTasks, obj]);
  },
  delete(id) {
    let oldTasks = this.get();
    let newTasks = oldTasks.filter((task, i) => i !== id);
    this.save(newTasks);
  },
  update(id, obj) {
    let oldTasks = this.get();
    let newTasks = oldTasks.map((task, i) => i === id ? obj : task);
    this.save(newTasks);
  },
  filter(value, basis = 'category') {
    return this.get().filter(val => val[basis.toLowerCase()].toLowerCase() === value.toLowerCase());
  },
  sort(k = 'fullname') {
    k = k.toLowerCase();
    return this.get().sort((a, b) => {
      let valA = a[k] || '';
      let valB = b[k] || '';
      return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });
  },
  search(query) {
    query = query.toLowerCase();
    return this.get().filter(val => val.fullname.toLowerCase().includes(query) || val.hometown.toLowerCase().includes(query) || val.purpose.toLowerCase().includes(query) ||
      val.category.toLowerCase().includes(query));
  },
  clear() {
    localStorage.removeItem(key);
    onUpdate([]);
  },
  reset(arr) {
    this.save(arr);
  }
});

const DOM = () => {
  let self = {
    tasks: local('tasks', (data) => {
      self.showcards(data);
    }),
    get(el, handler = null, eventType = 'click', attrs = {}, style = {}) {
      let element = document.querySelectorAll(el);
      element.forEach(el => {
        if (handler) {
          el.addEventListener(eventType, handler);
        }
        Object.assign(el, attrs);
        Object.assign(el.style, style);
      });
      return element.length > 1 ? element : element[0];
    },
    make(tag, dest, content = '', id = '', cls = '', attrs = {}, style = {}) {
      let element = document.createElement(tag);
      Object.assign(element, { id, textContent: content, className: cls, ...attrs });
      Object.assign(element.style, style);
      dest.append(element);
      return element;
    },
    on(el, handler, eventType = 'click') {
      el.addEventListener(eventType, handler);
    },
    verifier(evt, cls) {
      let target = evt.target;
      let exist = true;
      while (!target.classList.contains(cls)) {
        if (target.parentElement) {
          target = target.parentElement;
        }
        else {
          exist = false;
          break;
        }
      }
      return exist ? target : null;
    },
    confirmAction(cb, action = 'delete') {
      self.modal.className = (action + 'panel');
      action = action.toUpperCase();
      self.modal.querySelector('span').textContent = action;
      self.acceptBtn.disabled = false;
      self.acceptBtn.textContent = action;
      onAcceptCallback = cb;
      self.modal.showPopover();
    },
    lodr(dest = self.stack, color = '#000') {
      dest.innerHTML = '';
      dest.disabled = true;
      self.loader = self.make('div', dest, '', 'loader');
      self.loader.style.color = color;
      return self.loader;
    },
    toast(position = '') {
      self.toasters.className = `toaster-container ${position}`;
      return (msg, type = 'information') => {
        self.toasters.innerHTML += `<p id="toaster" class="${type}">${msg}<button>X</button></p>`;
        self.toasters.showPopover();
        clearTimeout(toastTimerId);
        toastTimerId = setTimeout(() => {
          self.toasters.innerHTML = '';
          self.toasters.hidePopover();
        }, 3000);
      };
    },
    tost(msg, type) {
      return self.toast()(msg, type);
    },
    escape(str) {
      return String(str).replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[char] || char));
    },
    highlight(text, q) {
      const escapedText = self.escape(text);
      if (!q) return escapedText;

      const escapedQuery = self.escape(q).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return escapedText.replace(regex, (match) => `<mark>${match}</mark>`);
    },
    showcards(arr = self.tasks.get(), delay = 0, query = '') {
      if (delay > 0) {
        self.lodr();
        clearTimeout(timerId);
        timerId = setTimeout(() => self.showcards(arr, 0, query), delay);
        return;
      }
      self.populateSortOptions();
      let content = '';
        let counts = arr.reduce((acc, card) => {
          acc[card.category] = (acc[card.category] || 0) + 1;
          return acc;
        }, {});
      self.dot.forEach(el => el.textContent = counts[el.id] || 0);

      if (arr.length !== 0) {
        arr.forEach((val, i) => {
          content += `<div id='${self.escape(val.category)}' class='card' index='${i}'>
     <img src="${self.escape(val.image)}" alt="">
     <button class='delete-note' ><i class="ri-delete-bin-7-line"></i></button>
        <h3>${self.highlight(val.fullname, query)}</h3>
        <p>Hometown <span>${self.highlight(val.hometown, query)}</span></p>
        <p>Purpose <span>${self.highlight(val.purpose, query)}</span></p>
        <div class="buttons">
          <button class="call" ><i class="ri-phone-line"></i>Call</button>
          <button class="message" ><i class="ri-message-3-line"></i>Message</button>
        </div>
        </div>`;
        });
        self.tost('Cards loaded successfully','success')
      } else {

        content = "<p id='toaster'>No cards found</p>";
        self.tost('No Cards Found','error')
      }
      self.stack.innerHTML = content;
    },
    populateSortOptions() {
      let options = self.tasks.get().reduce((acc, val) => {
        for (let k in val) {
          if (!acc.includes(k)) {
            acc.push(k);
          }
        }
        return acc;
      }, []);
      if (self.sort.children.length <= 1) {
        options.forEach(opt => {
          self.make('option', self.sort, opt);
        });
      }
    },
    searchTasks(query) {
      self.showcards(self.tasks.search(query), 1000, query);
      self.tost("Task Searched", 'success');
    }
  };

  let getEl = {
    modal: '#decisionModal',
    submitBtn: '#createNote',
    formTitle: 'h3',
    dataInp: '#bulk-data',
    resetToggle: '#replace',

    acceptBtn: ['#accept', (e) => {
      if (!onAcceptCallback) {
        self.modal.hidePopover();
        return;
      }
      self.lodr(e.target, 'white');
      timerId = setTimeout(() => {
        onAcceptCallback();
        self.modal.hidePopover();
        index = null;
      }, 2000);
    }],
    cancelBtn: ['#cancel', () => {
      clearTimeout(timerId);
      self.tost("Task cancelled", 'information');
      self.acceptBtn.disabled = false;
    }],
    formClose: ['#form-close', () => {

      clearTimeout(timerId);
      self.tost("Form closed", 'information');
      self.submitBtn.disabled = false;
      index = null;
      self.formContainer.reset();
      self.formTitle.textContent = 'New Call';
      self.submitBtn.textContent = 'Create Note';
    }],
    uploadClose: ['#upload-close', () => {
      clearTimeout(timerId);
      self.tost("Upload cancelled", 'information');
      self.uploadBtn.disabled = false;
      index = null;
      self.dataInp.value = '';
      self.resetToggle.checked = false;
    }],
    down_note: ['#down-note', () => {
      let first = self.stack.firstElementChild;
      if (first) {
        self.stack.append(first);
      }
    }],
    up_note: ['#up-note', () => {
      let last = self.stack.lastElementChild;
      if (last) {
        self.stack.prepend(last);
      }
    }],
    edit_note: ['#edit-note', (e) => {
      let activeCard = self.stack.lastElementChild;
      index = +activeCard.attributes.index?.value;
      if (!index && index !== 0) return;
      let data = self.tasks.get()[index];
      self.formTitle.textContent = 'Update Note';
      self.submitBtn.textContent = 'Update Note';
      let form = self.formContainer.querySelector.bind(self.formContainer);
      for (let key in data) {
        if (key === 'category') {
          let field = form(`input[value='${data[key]}']`);
          if (field) {
            field.checked = true;
          } else {
            self.tost('Category not found', 'error');
          }
        }
        else {
          let field = form(`#${CSS.escape(key)}`);
          if (field) {
            field.value = data[key];
          }
        }
      }
      self.formContainer.showPopover();
    }],
    clear_all: ['#clear-all', () => {
      if (self.tasks.get().length !== 0) {
        self.confirmAction(() => {
          self.tasks.clear();
          self.tost('All tasks cleared', 'success');
        }, 'clear');
      }
    }],
    reset: ['#reset', () => {
      self.dataInp.value = '';
    }],
    bulk_upload: ['#bulk-upload', () => {
      self.uploadBtn.disabled = false;
      self.uploadBtn.innerHTML = 'Upload';
      self.get('#uploadPanel').showPopover();
    }],
    uploadBtn: ['#upload', (e) => {
      self.lodr(e.target, 'white');
      const val = self.dataInp.value.trim();
      if (!val) {
        self.uploadBtn.disabled = false;
        self.uploadBtn.innerHTML = 'Upload';
        return;
      }

      const parseQuery = (str) => Object.fromEntries(new URLSearchParams(str));
      const filterLines = (input) => {
        return input.split('\n').map(l => l.trim()).filter(Boolean);
      }

      const parsers = {
        json(input) {
          const parsed = JSON.parse(input);
          if (!Array.isArray(parsed)) throw new Error("Invalid JSON format! It must be an array.");
          return parsed;
        },
        list(input) {
          const lines = filterLines(input);
          if (lines.length < 5) throw new Error("List format requires groups of 5 lines (Image, Name, Hometown, Purpose, Category)");

          const parsedCards = [];
          for (let i = 0; i < lines.length; i += 5) {
            if (i + 4 < lines.length) {
              const obj = {};
              let j = 0;
              for (const key in demo[0]) {
                obj[key] = lines[i + j];
                j++;
              }
              parsedCards.push(obj);
            }
          }
          return parsedCards;
        },
        newline(input) {
          const queryString = filterLines(input).join('&');
          const data = parseQuery(queryString);
          return Object.keys(data).length > 0 ? [data] : [];
        },
        url(input) {
          return filterLines(input).map(parseQuery);
        },
        text(input) {
          return filterLines(input).map(line =>
            parseQuery(line.replace(/,/g, '&'))
          );
        },
        csv(input) {
          return this.text(input);
        }
      };

      let json = parsers[method](val);

      if (json.length > 0) {
        if (self.resetToggle.checked) {
          self.confirmAction(() => {
            self.tasks.reset(json);
            self.tost('All tasks Replaced', 'success');
            self.uploadClose.click();
          }, 'reset');
          self.resetToggle.click();
        } else {
          timerId = setTimeout(() => {
            json.forEach(data => self.tasks.add(data));
            self.tost("All tasks Added", 'success');
            self.uploadClose.click();
          }, 2000);
        }
      }
    }],

    search: ['#search', (e) => {
      let val = e.target.value.trim();
      if (!val) {
        self.suggestSpan.innerHTML = '';
        self.activeSuggestion = '';
        self.showcards();
        return;
      }
      const match = self.tasks.get().find(card => card.fullname.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        self.activeSuggestion = match.fullname;
        self.suggestSpan.innerHTML = `${self.escape(val)}<mark>${self.escape(match.fullname.slice(val.length))}</mark>`;
      } else {
        self.suggestSpan.innerHTML = '';
        self.activeSuggestion = '';
      }
    }, 'input'],
    sort: ['#sort', (e) => {
      self.showcards(self.tasks.sort(e.target.value), 1000);
      self.tost('Tasks sorted', 'success');
    }, 'change'],
    uploadType: ['#uploadType', (e) => {
      method = e.target.value;
      const item = demo[0];

      const entries = Object.entries(item);
      const values = Object.values(item);

      const formatEntries = (separator) => entries.map(([k, v]) => `${k}=${v}`).join(separator);
      const formatValues = (separator) => values.join(separator);

      const formatters = {
        json: () => JSON.stringify(demo),
        newline: () => formatEntries('\n'),
        url: () => formatEntries('&'),
        list: () => formatValues('\n'),
        text: () => formatEntries(','),
        csv: () => formatValues(',')
      };

      const formatter = formatters[method];
      self.dataInp.placeholder = formatter ? formatter() : '';
    }, 'change'],
    formContainer: ['.form-container', (e) => {
      e.preventDefault();
      let data = Object.fromEntries(new FormData(e.target).entries());
      let warnText = self.get('#warning-text').style;
      for (let key in data) {
        if (data[key].trim() === '') {
          return warnText.display = 'flex';
        }
      }
      if (index || index === 0) {
        self.confirmAction(() => {
          self.tasks.update(index, data);
          self.tost("Task updated", 'success');
          self.formClose.click();
        }, 'update');
      } else {
        self.lodr(self.submitBtn, 'white');
        timerId = setTimeout(() => {
          self.tasks.add(data);
          self.tost("Task added", 'success');
          self.formClose.click();
        }, 2000);
      }
      return warnText.display = 'none';
    }, 'submit'],

    stack: ['.stack', (e) => {
      let target = self.verifier(e,'delete-note');
      if (target) {
        target = target.parentElement;
        index = +target.attributes.index.value;
        self.confirmAction(() => {
          self.tasks.delete(index);
          self.tost("Task deleted", 'success');
        });
      }
      target = self.verifier(e, 'call');
      if (target) {
        console.log(target.parentElement.parentElement);
      }
      target = self.verifier(e, 'message');
      if (target) {
        console.log(target.parentElement.parentElement);
      }
    }],
    cat: ['.form-container .category div', (e) => {
      let id = e.target.id;
      let child = e.target.children[0];
      if (id && child) {
        child.click();
      }
    }],
    dot: ['.dot', (e) => {
      let id = e.target.id;
      if (id) {
        self.showcards(self.tasks.filter(id), 2000);
        self.tost("Task Filtered", 'success');
      }
    }],
    toasters: ['#toaster-container', (e) => {
      let toaster = e.target.closest('#toaster');
      if (toaster && e.target.tagName === 'BUTTON') {
        toaster.remove();
        if (self.toasters.children.length === 0) {
          self.toasters.hidePopover();
        }
      }
    }],
    suggestSpan: '#search-suggestion',
    searchBtn: '#search-icon',
  };

  for (let key in getEl) {
    self[key] = self.get(...[].concat(getEl[key]));
  }

  let makeEl = {
  };
  for (let key in makeEl) {
    self[key] = self.make(...[].concat(makeEl[key]));
  }

  self.activeSuggestion = '';

  self.on(self.search, (e) => {
    let val = e.target.value.trim();

    if ((e.key === 'Tab' || e.key === 'ArrowRight') && self.activeSuggestion) {
      e.preventDefault();
      self.search.value = self.activeSuggestion;
      self.suggestSpan.innerHTML = '';
      self.activeSuggestion = '';
    }
    if (e.key === 'Enter') {
      self.searchTasks(val)
    }
  }, 'keydown');

  self.on(self.searchBtn, () => {
    let val = self.search.value.trim();
    if (val) {
      self.searchTasks(val)
    }
  });

  return self;
};

let el = DOM();
el.dataInp.placeholder = `${JSON.stringify(demo)}`;
el.showcards();
