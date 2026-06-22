// ============================================================
// cookieesandcakes — Form Validation + Formspree
// ============================================================

import { auth, db } from './firebase-config.js';
import { ref, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

export function initForm(formId) {
  const form    = document.getElementById(formId);
  if (!form) return;

  const submit  = form.querySelector('.form-submit');
  const msgOk   = document.getElementById('form-success');
  const msgErr  = document.getElementById('form-error');

  // ── Validate single field ────────────────────────────────
  function validateField(field) {
    const wrapper = field.closest('.form-field');
    const errorEl = wrapper?.querySelector('.field-error');
    let msg = '';

    if (field.required && !field.value.trim()) {
      msg = 'This field is required.';
    } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      msg = 'Please enter a valid email address.';
    } else if (field.type === 'tel' && field.value && !/^[\d\s\+\-\(\)]{7,15}$/.test(field.value)) {
      msg = 'Please enter a valid phone number.';
    }

    if (msg) {
      field.classList.add('invalid');
      field.classList.remove('valid');
      if (errorEl) errorEl.textContent = msg;
      wrapper?.classList.add('has-error');
      return false;
    } else {
      field.classList.remove('invalid');
      if (field.value.trim()) field.classList.add('valid');
      if (errorEl) errorEl.textContent = '';
      wrapper?.classList.remove('has-error');
      return true;
    }
  }

  // Live validation on blur
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.classList.contains('invalid')) validateField(field);
    });
  });

  // ── Submit ───────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    const fields = [...form.querySelectorAll('input:not([type=hidden]), select, textarea')];
    const allValid = fields.map(validateField).every(Boolean);
    if (!allValid) {
      form.querySelector('.invalid')?.focus();
      return;
    }

    // Loading state
    submit.classList.add('loading');
    submit.disabled = true;
    msgOk?.classList.remove('show');
    msgErr?.classList.remove('show');

    try {
      const name = form.querySelector('#name')?.value || '';
      const email = form.querySelector('#email')?.value || '';
      const phone = form.querySelector('#phone')?.value || '';
      const product = form.querySelector('#product')?.value || '';
      const quantity = form.querySelector('#quantity')?.value || '';
      const eventDate = form.querySelector('#event-date')?.value || '';
      const specialInstructions = form.querySelector('#message')?.value || '';

      const orderData = {
        userId: auth.currentUser ? auth.currentUser.uid : 'guest',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        product: product,
        quantity: quantity,
        eventDate: eventDate,
        specialInstructions: specialInstructions,
        createdAt: Date.now(),
        status: 'Pending'
      };

      // Save directly to Firebase Realtime Database
      await push(ref(db, 'orders'), orderData);

      form.reset();
      form.querySelectorAll('input, select, textarea').forEach(f => {
        f.classList.remove('valid', 'invalid');
      });
      msgOk?.classList.add('show');
      msgOk?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error("Order submission error:", error);
      msgErr?.classList.add('show');
    } finally {
      submit.classList.remove('loading');
      submit.disabled = false;
    }
  });

  // ── Pre-fill from URL param ──────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const item   = params.get('item');
  if (item) {
    const sel = form.querySelector('[name="product"]');
    if (sel) {
      // Check if it already matches a broad category just in case
      let matched = false;
      [...sel.options].forEach(opt => {
        if (opt.value.toLowerCase() === item.toLowerCase()) {
          opt.selected = true;
          matched = true;
        }
      });
      // If it's a specific product from the menu, add it as a new option
      if (!matched) {
        const newOption = document.createElement('option');
        newOption.value = item;
        newOption.textContent = '✨ ' + item;
        newOption.selected = true;
        sel.appendChild(newOption);
      }
    }
  }
}

// ── FAQ Accordion ────────────────────────────────────────────
export function initAccordion() {
  document.querySelectorAll('.accordion-item').forEach(item => {
    const header = item.querySelector('.accordion-header');
    header?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.accordion-item.open').forEach(i => i.classList.remove('open'));
      // Open clicked if it wasn't open
      if (!isOpen) item.classList.add('open');
    });
  });
}
