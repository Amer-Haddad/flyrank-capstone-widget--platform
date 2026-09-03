const widgetsRepository = require("../repositories/widgets.repository");
const { HttpError } = require("../utils/http-error");

async function getPublicWidgetConfig(widgetId) {
  if (!widgetId || typeof widgetId !== "string") {
    throw new HttpError(400, "INVALID_WIDGET_ID", "widgetId is required.");
  }

  const widget = await widgetsRepository.findPublicWidgetConfig(widgetId);

  if (!widget) {
    throw new HttpError(404, "WIDGET_NOT_FOUND", "Widget does not exist.");
  }

  if (!widget.is_active) {
    throw new HttpError(403, "WIDGET_INACTIVE", "Widget is inactive.");
  }

  return {
    widgetId: widget.id,
    tenantId: widget.tenant_id,
    type: widget.type,
    title: widget.title,
    description: widget.description || null,
    buttonText: widget.button_text,
    version: widget.version,
    displayOptions: widget.display_options || {},
    fields: Array.isArray(widget.fields) ? widget.fields : [],
  };
}

function createWidgetScript() {
  return `(function () {
    const scriptTag = document.currentScript || document.querySelector('script[src*="/widget.js"]');
    if (!scriptTag) return;

    const scriptUrl = new URL(scriptTag.src);
    const widgetId = scriptUrl.searchParams.get('id');
    const version = scriptUrl.searchParams.get('v') || '1';

    if (!widgetId) return;

    const configUrl = scriptUrl.origin + '/api/public/widgets/' + encodeURIComponent(widgetId) + '/config?version=' + encodeURIComponent(version);

    function createField(field) {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '12px';

      const label = document.createElement('label');
      label.textContent = field.label || field.key;
      label.style.display = 'block';
      label.style.marginBottom = '6px';
      label.style.fontWeight = '600';

      const input = document.createElement(field.type === 'email' ? 'input' : 'input');
      input.type = field.type === 'email' ? 'email' : 'text';
      input.name = field.key;
      input.placeholder = field.label || field.key;
      input.required = Boolean(field.required);
      input.style.width = '100%';
      input.style.padding = '10px';
      input.style.boxSizing = 'border-box';
      input.style.borderRadius = '8px';
      input.style.border = '1px solid #d1d5db';

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      return wrapper;
    }

    function renderForm(config) {
      const container = document.createElement('div');
      container.style.maxWidth = '420px';
      container.style.fontFamily = 'sans-serif';
      container.style.padding = '16px';
      container.style.border = '1px solid #e5e7eb';
      container.style.borderRadius = '12px';
      container.style.background = '#ffffff';

      if (config.title) {
        const title = document.createElement('h3');
        title.textContent = config.title;
        title.style.margin = '0 0 8px';
        container.appendChild(title);
      }

      if (config.description) {
        const description = document.createElement('p');
        description.textContent = config.description;
        description.style.margin = '0 0 16px';
        description.style.color = '#4b5563';
        container.appendChild(description);
      }

      const form = document.createElement('form');
      form.style.display = 'grid';
      form.style.gap = '12px';

      (config.fields || []).forEach(function (field) {
        form.appendChild(createField(field));
      });

      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = config.buttonText || 'Submit';
      button.style.padding = '10px 16px';
      button.style.background = '#2563eb';
      button.style.color = '#ffffff';
      button.style.border = 'none';
      button.style.borderRadius = '8px';
      button.style.cursor = 'pointer';
      form.appendChild(button);

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        const payload = {};
        const formData = new FormData(form);
        formData.forEach(function (value, key) {
          payload[key] = value;
        });

        fetch(scriptUrl.origin + '/api/public/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ widgetId: widgetId, payload: payload })
        }).then(function (response) {
          if (!response.ok) {
            throw new Error('Submission failed');
          }
          return response.json();
        }).then(function () {
          button.textContent = 'Submitted';
          button.disabled = true;
        }).catch(function () {
          button.textContent = 'Try again';
        });
      });

      container.appendChild(form);
      scriptTag.insertAdjacentElement('afterend', container);
    }

    fetch(configUrl, { headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Widget config unavailable');
        }
        return response.json();
      })
      .then(function (body) {
        if (body && body.success && body.data) {
          renderForm(body.data);
        }
      })
      .catch(function () {
        console.warn('FlyRank widget could not load config.');
      });
  })();`;
}

module.exports = {
  getPublicWidgetConfig,
  createWidgetScript,
};
