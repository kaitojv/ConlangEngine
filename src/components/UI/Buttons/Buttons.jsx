// ./src/components/UI/buttons.csx
import './buttons.css';

export default function Button({ variant = 'save', children, className = '', ...props }) {
  const variantClass = 
  ({
    save: 'save',
    edit: 'edit',
    cancel: 'cancel',
    ipa: 'ipa',
    error: 'error',
    import: 'import',
    toggle: 'toggle',
    'toggle-active': 'toggle-active',
    default: 'default'
  })[variant] || 'save';
  
  return (
    <button className={`btn-${variantClass} btn-base ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
