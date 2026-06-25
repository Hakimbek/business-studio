"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Company { id: string; name: string; }

interface CompanyContextType {
  company: Company | null;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  selectCompany: () => {},
  clearCompany: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const id = getCookie("company-id");
    const name = getCookie("company-name");
    if (id && name) setCompany({ id, name });
  }, []);

  function selectCompany(c: Company) {
    setCookie("company-id", c.id);
    setCookie("company-name", c.name);
    setCompany(c);
  }

  function clearCompany() {
    deleteCookie("company-id");
    deleteCookie("company-name");
    setCompany(null);
  }

  return (
    <CompanyContext.Provider value={{ company, selectCompany, clearCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}
