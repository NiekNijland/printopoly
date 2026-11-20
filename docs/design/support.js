// Minimal local runtime for the *.dc.html design files, so they can be opened
// in a browser outside the design canvas. Supports what these files use:
// <helmet>, <sc-for list as>, <sc-if value>, {{path}} in text and attributes,
// onClick/onChange handlers, and a DCLogic class with state and setState.
(function () {
  'use strict';

  window.DCLogic = class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(patch) {
      this.state = Object.assign({}, this.state, typeof patch === 'function' ? patch(this.state) : patch);
      if (this.__render) this.__render();
    }
    renderVals() {
      return {};
    }
  };

  var FULL = /^\{\{\s*([^}]+?)\s*\}\}$/;
  var ANY = /\{\{\s*([^}]+?)\s*\}\}/g;

  function lookup(path, scopes) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    for (var i = scopes.length - 1; i >= 0; i--) {
      var s = scopes[i];
      if (s && Object.prototype.hasOwnProperty.call(s, parts[0])) {
        var v = s[parts[0]];
        for (var j = 1; j < parts.length && v != null; j++) v = v[parts[j]];
        return v;
      }
    }
    return undefined;
  }

  function interpolate(str, scopes) {
    return str.replace(ANY, function (_, p) {
      var v = lookup(p, scopes);
      return v == null ? '' : String(v);
    });
  }

  function processChildren(parent, scopes) {
    Array.prototype.slice.call(parent.childNodes).forEach(function (n) {
      processNode(n, scopes);
    });
  }

  function processNode(node, scopes) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') !== -1) node.nodeValue = interpolate(node.nodeValue, scopes);
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-for') {
      var m = FULL.exec(node.getAttribute('list') || '');
      var list = m ? lookup(m[1], scopes) || [] : [];
      var as = node.getAttribute('as') || 'item';
      var frag = document.createDocumentFragment();
      list.forEach(function (item, index) {
        var scope = {};
        scope[as] = item;
        scope.index = index;
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          var clone = c.cloneNode(true);
          frag.appendChild(clone);
          processNode(clone, scopes.concat([scope]));
        });
      });
      node.replaceWith(frag);
      return;
    }

    if (tag === 'sc-if') {
      var mv = FULL.exec(node.getAttribute('value') || '');
      var on = mv ? lookup(mv[1], scopes) : false;
      if (!on) {
        node.remove();
        return;
      }
      var kids = document.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        kids.appendChild(c);
      });
      processChildren(kids, scopes);
      node.replaceWith(kids);
      return;
    }

    Array.prototype.slice.call(node.attributes).forEach(function (attr) {
      var name = attr.name;
      var val = attr.value;
      if (name.indexOf('hint-') === 0) {
        node.removeAttribute(name);
        return;
      }
      if (val.indexOf('{{') === -1) return;
      var full = FULL.exec(val);
      if (name === 'onclick' || name === 'onchange' || name === 'oninput') {
        node.removeAttribute(name);
        var fn = full ? lookup(full[1], scopes) : null;
        if (typeof fn === 'function') node.addEventListener(name.slice(2), fn);
        return;
      }
      if (full) {
        var v = lookup(full[1], scopes);
        if (v === false || v == null) {
          node.removeAttribute(name);
          if (name === 'checked') node.checked = false;
          return;
        }
        if (v === true) {
          node.setAttribute(name, name.indexOf('aria-') === 0 ? 'true' : '');
          if (name === 'checked') node.checked = true;
          return;
        }
        node.setAttribute(name, String(v));
        if (name === 'value' && 'value' in node) node.value = String(v);
        return;
      }
      node.setAttribute(name, interpolate(val, scopes));
    });
    processChildren(node, scopes);
  }

  function boot() {
    document.querySelectorAll('helmet').forEach(function (h) {
      Array.prototype.slice.call(h.childNodes).forEach(function (c) {
        document.head.appendChild(c);
      });
      h.remove();
    });

    var root = document.querySelector('x-dc');
    if (!root) return;
    var template = root.innerHTML;
    var script = document.querySelector('script[type="text/x-dc"]');
    var props = {};
    var logic = null;
    if (script) {
      try {
        props = JSON.parse(script.getAttribute('data-props') || '{}');
      } catch (e) {
        props = {};
      }
      var Component = new Function('DCLogic', script.textContent + '\n;return Component;')(window.DCLogic);
      logic = new Component(props);
    }

    function render() {
      var vals = logic ? logic.renderVals() || {} : {};
      root.innerHTML = template;
      processChildren(root, [props, vals]);
    }
    if (logic) logic.__render = render;
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
