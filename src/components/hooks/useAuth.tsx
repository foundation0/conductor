import React from "react";
import { AuthContext } from "@/components/libraries/auth";

export function useAuth() {
  return React.useContext(AuthContext);
}