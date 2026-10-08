import { forwardRef } from 'react';
import './buttons.css';

const Button = forwardRef(function Button(
  { variant = 'save', children, className = '', ...props },
  ref
) {
  const variantClass =
    ({
      save: 'save',
      edit: 'edit',
      cancel: 'cancel',
      ipa: 'ipa',
      listen: 'listen',
      error: 'error',
      import: 'import',
      toggle: 'toggle',
      'toggle-active': 'toggle-active',
      default: 'default',
      // `imp` = generic prominent/primary CTA. Historically it fell through to
      // the `save` mapping, so it is deliberately kept visually identical to
      // avoid changing ~45 existing call sites app-wide.
      imp: 'imp',
      accent: 'accent'
    })[variant] || 'save';

  return (
    <button
      ref={ref}
      className={`btn-${variantClass} btn-base ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
