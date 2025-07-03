import React from "react";

interface SettingFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

const SettingField = ({ label, children }: SettingFieldProps) => {
  return (
    <div className="flex justify-between items-center">
      <p>{label}</p>
      {children}
    </div>
  );
};

export default SettingField;
