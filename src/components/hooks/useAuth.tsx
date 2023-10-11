import React from "react";
import { AuthContext } from "@/libraries/auth";

export function useAuth() {
  return React.useContext(AuthContext);
}