import { keys } from "../keys";
import { VercelToolbarClient } from "./toolbar-client";

export const Toolbar = () =>
  keys().FLAGS_SECRET ? <VercelToolbarClient /> : null;
