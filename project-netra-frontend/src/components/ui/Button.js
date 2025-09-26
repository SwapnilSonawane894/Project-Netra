// src/components/ui/Button.js
import styles from './Button.module.css';

export default function Button({ children, onClick, type = 'button', variant = 'primary' }) {
  // `variant` could be 'primary', 'secondary', 'danger', etc.
  const buttonClass = styles[variant];
  return (
    <button type={type} onClick={onClick} className={`${styles.button} ${buttonClass}`}>
      {children}
    </button>
  );
}