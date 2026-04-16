// ./src/components/UI/buttons.csx
import './buttons.css';

export default function Button({ variant = 'save', children, ...props }) {
  const variantClass = 
  ({
    save: 'save',
    edit: 'edit',
    cancel: 'cancel',
    ipa: 'ipa',
    error: 'error',
    import: 'import',
    default: 'default'
  })[variant] || 'save';
  
  return (
    <button className={`btn-${variant} btn-base`}  {...props}>
      {children}
    </button>
  );
}
