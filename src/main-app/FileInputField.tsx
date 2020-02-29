import * as React from "react";

interface FileInputFieldProps {
  label: string;
  onChange: (file: File) => void;
}

export const FileInputField: React.FunctionComponent<FileInputFieldProps> = ({
  label,
  onChange,
}) => {
  const onInputChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const inputElement = evt.target;
      const files = inputElement.files;
      if (!files || !files[0]) {
        return;
      }
      onChange(files[0]);
    },
    [onChange],
  );
  return (
    <span className="button file-input-button">
      <span>{label}</span>
      <input type="file" accept="image/*" className="file-input" onChange={onInputChange} />
    </span>
  );
};
