import { useNavigate, To } from "react-router";

export const useNavigation = () => {
  const navigate = useNavigate();

  const handleNavigate = (page: To) => {
    navigate(page);
  };

  return { handleNavigate };
};
