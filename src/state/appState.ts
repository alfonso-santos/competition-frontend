// src/state/appState.ts

export type ApiStatus = "checking" | "ok" | "down" | "missing_base_url";
export type Page = "landing" | "select" | "dashboard";

export type AppState = {
  apiStatus: ApiStatus;
  page: Page;
  selectedContestId: string;
  globalMessage: string;
};

export type AppAction =
  | { type: "SET_API_STATUS"; status: ApiStatus }
  | { type: "SET_PAGE"; page: Page }
  | { type: "SET_SELECTED_CONTEST"; contestId: string }
  | { type: "SET_GLOBAL_MESSAGE"; message: string }
  | { type: "CLEAR_GLOBAL_MESSAGE" }
  | { type: "RESET_UI" };

export const initialAppState: AppState = {
  apiStatus: "checking",
  page: "landing",
  selectedContestId: "",
  globalMessage: "",
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_API_STATUS":
      return { ...state, apiStatus: action.status };
    case "SET_PAGE":
      return { ...state, page: action.page };
    case "SET_SELECTED_CONTEST":
      return { ...state, selectedContestId: action.contestId };
    case "SET_GLOBAL_MESSAGE":
      return { ...state, globalMessage: action.message };
    case "CLEAR_GLOBAL_MESSAGE":
      return { ...state, globalMessage: "" };
    case "RESET_UI":
      return { ...initialAppState, apiStatus: state.apiStatus }; // conserva status
    default:
      return state;
  }
}
