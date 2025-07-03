import Select from "react-select";

export const CustomSelect = (props: any) => {
  return (
    <Select
      {...props}
      menuPortalTarget={document.body}
      isSearchable={false}
      isOptionDisabled={(option: any) => option.disabled}
      styles={{
        control: (provided) => ({
          ...provided,
          minHeight: props["minHeight"] ?? "40px",
          // ":after": {
          //   borderColor: "red",
          // },
        }),
        singleValue: (provided) => ({
          ...provided,
          color: "oklch(55.1% 0.027 264.364)",
        }),

        dropdownIndicator: (provided) => ({
          ...provided,
          padding: "0px",
        }),

        menu: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
        menuPortal: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected
            ? provided.backgroundColor
            : "transparent",
          "&:hover": {
            backgroundColor: "transparent",
          },
        }),
      }}
    />
  );
};
