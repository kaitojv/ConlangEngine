import './input.css';

export default function Input({ label, className = '', ...props }) {
    return (
        <div className="input-wrapper">
            {label && <label className="form-label">{label}</label>}
            <input className={`fi ${className}`.trim()} {...props} />
        </div>
    )
};
