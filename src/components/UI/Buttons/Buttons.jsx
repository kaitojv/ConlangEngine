// ./src/components/UI/buttons.csx
import './buttons.css';
import { motion } from 'framer-motion';

export default function Button({ variant = 'save', children, className = '', ...props }) {
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
    default: 'default'
  })[variant] || 'save';
  
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`btn-${variantClass} btn-base ${className}`.trim()} 
      {...props}
    >
      {children}
    </motion.button>
  );
}
