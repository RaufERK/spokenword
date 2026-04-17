import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { AdminRoot } from "./components/admin/AdminRoot";
import { Home } from "./components/Home";
import { Archive } from "./components/Archive";
import { ChatNew } from "./components/ChatNew";
import { Conference } from "./components/Conference";
import { PaidMaterials } from "./components/PaidMaterials";
import { Profile } from "./components/Profile";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { AdminStreamLinks } from "./components/admin/AdminStreamLinks";
import { AdminClassManagement } from "./components/admin/AdminClassManagement";
import { AdminConferenceUpload } from "./components/admin/AdminConferenceUpload";
import { AdminPackages } from "./components/admin/AdminPackages";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminEvents } from "./components/admin/AdminEvents";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "archive", Component: Archive },
      { path: "chat", Component: ChatNew },
      { path: "conference", Component: Conference },
      { path: "paid-materials", Component: PaidMaterials },
      { path: "profile", Component: Profile },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
    ],
  },
  {
    path: "/admin",
    Component: AdminRoot,
    children: [
      { index: true, Component: AdminStreamLinks },
      { path: "class-management", Component: AdminClassManagement },
      { path: "conference-upload", Component: AdminConferenceUpload },
      { path: "packages", Component: AdminPackages },
      { path: "users", Component: AdminUsers },
      { path: "events", Component: AdminEvents },
    ],
  },
]);