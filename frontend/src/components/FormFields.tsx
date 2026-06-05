export function LabeledInput(props: {
  label: string
  name: string
  defaultValue?: string
  type?: string
}) {
  return (
    <label className="field">
      {props.label}
      <input
        name={props.name}
        defaultValue={props.defaultValue}
        type={props.type ?? 'text'}
        required
      />
    </label>
  )
}

export function LabeledSelect(props: {
  label: string
  name: string
  defaultValue?: string
  options: string[] | { label: string; value: string }[]
}) {
  return (
    <label className="field">
      {props.label}
      <select name={props.name} defaultValue={props.defaultValue}>
        {props.options.map((option) => {
          if (typeof option === 'string') {
            return (
              <option key={option} value={option}>
                {formatOptionLabel(option)}
              </option>
            )
          }

          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

function formatOptionLabel(value: string) {
  const labels: Record<string, string> = {
    female: '여성',
    male: '남성',
    solar: '양력',
    lunar: '음력',
    Google: '구글',
    Kakao: '카카오',
    Naver: '네이버',
  }

  return labels[value] ?? value
}
