import { Link } from 'react-router-dom'

export function Breadcrumb(props: {
  items: { label: string; to?: string }[]
  step?: string
}) {
  return (
    <div className="breadcrumb-wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        {props.items.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
          </span>
        ))}
      </nav>
      {props.step && <span className="step-pill">{props.step}</span>}
    </div>
  )
}
