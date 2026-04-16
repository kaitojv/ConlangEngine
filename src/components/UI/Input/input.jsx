import './input.css';

export default function Input({ label, className = '', ...props }) {
    return (
        <div className="input-wrapper">
            {label && <label className="input-label">{label}</label>}
            <input className={`fi ${className}`.trim()} {...props} />
        </div>
    )
};