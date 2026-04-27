import type { CSSProperties } from "react";

export const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f4efe8",
  color: "#1f1b16",
  fontFamily: '"Segoe UI", "Microsoft YaHei UI", sans-serif',
  padding: "24px"
};

export const shellInnerStyle: CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "grid",
  gap: "20px"
};

export const headerPanelStyle: CSSProperties = {
  background: "#fffdf9",
  border: "1px solid #d5c9ba",
  borderRadius: "20px",
  padding: "20px"
};

export const pagePanelStyle: CSSProperties = {
  background: "#fffdf9",
  border: "1px solid #d5c9ba",
  borderRadius: "20px",
  padding: "24px",
  minHeight: "360px"
};

export const panelStyle: CSSProperties = {
  border: "1px solid #d5c9ba",
  borderRadius: "18px",
  padding: "20px",
  background: "#fff"
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: "14px"
};

export const primaryActionStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "10px 18px",
  border: "1px solid #8f481d",
  background: "#a95522",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 2px 0 #6f3516"
};

export const secondaryActionStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "10px 18px",
  border: "1px solid #9f7657",
  background: "#fff1e3",
  color: "#1f1b16",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 2px 0 #d6b99c"
};

export const ghostActionStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "9px 16px",
  border: "1px solid #a99079",
  background: "#fffaf4",
  color: "#1f1b16",
  cursor: "pointer",
  fontWeight: 650,
  boxShadow: "0 1px 0 #ded0bf"
};

export const activeTabStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  border: "1px solid #d7b191",
  background: "#f1d8c6",
  color: "#8d4c22",
  fontSize: "13px"
};

export const inactiveTabStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "9px 14px",
  border: "1px solid #b5a28e",
  background: "#fffaf4",
  color: "#493f35",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 650,
  boxShadow: "0 1px 0 #ded0bf"
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #d5c9ba",
  background: "#fff"
};

export const tableHeaderStyle: CSSProperties = {
  border: "1px solid #d5c9ba",
  background: "#f4ece2",
  padding: "10px 12px",
  textAlign: "center",
  verticalAlign: "middle"
};

export const tableCellStyle: CSSProperties = {
  border: "1px solid #d5c9ba",
  padding: "10px 12px",
  verticalAlign: "top"
};

export const groupedTableCellStyle: CSSProperties = {
  ...tableCellStyle,
  background: "#fffdf9",
  fontWeight: 700,
  textAlign: "center",
  verticalAlign: "middle"
};

export const stripedBlueCellStyle: CSSProperties = {
  ...tableCellStyle,
  background: "#edf3fb"
};

export const stripedOrangeCellStyle: CSSProperties = {
  ...tableCellStyle,
  background: "#fbf0e5"
};
