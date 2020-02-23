import * as React from "react";

interface FileInputFieldProps {
  label: string;
  onChange: (file: File) => void;
}

export const FileInputField: React.FunctionComponent<FileInputFieldProps> = props => {
  const onChange = React.useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = evt.target;
    const files = inputElement.files;
    if (!files || !files[0]) {
      return;
    }
    props.onChange(files[0]);
  }, [props.onChange]);
  return (<span className="button file-input-button">
    <span>{props.label}</span>
    <input type="file" accept="image/*" className="file-input" onChange={onChange} />
  </span>);
};
