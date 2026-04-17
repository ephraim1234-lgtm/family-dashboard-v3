import { AuthStatusPanel } from "../../../components/auth-status-panel";
import { AppChoresBoard } from "../../../components/app-chores-board";

export default function AppHomePage() {
  return (
    <>
      <div className="section-spacer" />
      <AppChoresBoard />

      <div className="section-spacer" />
      <AuthStatusPanel />
    </>
  );
}
