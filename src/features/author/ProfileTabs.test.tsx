import type { ComponentProps } from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ProfileTabs } from "./ProfileTabs";

function renderTabs(props: Partial<ComponentProps<typeof ProfileTabs>> = {}) {
  return render(
    <ProfileTabs
      isOwnProfile={false}
      packsCount={5}
      peopleCount={12}
      packsPanel={<div>Packs panel content</div>}
      peoplePanel={(subTab) => <div>People panel ({subTab})</div>}
      historyPanel={<div>History panel content</div>}
      {...props}
    />,
  );
}

describe("ProfileTabs", () => {
  it("renders a tablist with Packs, People and History tabs", () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent("Packs");
    expect(tabs[1]).toHaveTextContent("People");
    expect(tabs[2]).toHaveTextContent("Recently played");
  });

  it("shows the Packs/People counts as a pill beside each label", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: /Packs/ })).toHaveTextContent("5");
    expect(screen.getByRole("tab", { name: /People/ })).toHaveTextContent("12");
  });

  it("labels the History tab 'Recently played' for a visitor and 'History' for the owner", () => {
    const { rerender } = renderTabs({ isOwnProfile: false });
    expect(
      screen.getByRole("tab", { name: "Recently played" }),
    ).toBeInTheDocument();

    rerender(
      <ProfileTabs
        isOwnProfile
        packsCount={5}
        peopleCount={12}
        packsPanel={<div>Packs panel content</div>}
        peoplePanel={(subTab) => <div>People panel ({subTab})</div>}
        historyPanel={<div>History panel content</div>}
      />,
    );
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
  });

  it("shows the Packs panel by default with the Packs tab marked selected", () => {
    renderTabs();
    expect(screen.getByText("Packs panel content")).toBeInTheDocument();
    expect(
      screen.queryByText("People panel (followers)"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Packs/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /People/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("swaps the visible panel when a different tab is clicked", async () => {
    renderTabs();

    await userEvent.click(screen.getByRole("tab", { name: /People/ }));

    expect(screen.getByText("People panel (followers)")).toBeInTheDocument();
    expect(screen.queryByText("Packs panel content")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /People/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Packs/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    await userEvent.click(screen.getByRole("tab", { name: /Recently played/ }));

    expect(screen.getByText("History panel content")).toBeInTheDocument();
    expect(
      screen.queryByText("People panel (followers)"),
    ).not.toBeInTheDocument();
  });

  it("honors initialTab and initialPeopleSubTab for deep-linking into the People tab", () => {
    renderTabs({ initialTab: "people", initialPeopleSubTab: "following" });

    expect(screen.getByText("People panel (following)")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /People/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("associates the active tab with its tabpanel via aria-controls/id/aria-labelledby", async () => {
    renderTabs();
    const packsTab = screen.getByRole("tab", { name: /Packs/ });
    const panel = screen.getByRole("tabpanel");
    expect(packsTab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", packsTab.id);

    await userEvent.click(screen.getByRole("tab", { name: /People/ }));

    const peopleTab = screen.getByRole("tab", { name: /People/ });
    const updatedPanel = screen.getByRole("tabpanel");
    expect(peopleTab).toHaveAttribute("aria-controls", updatedPanel.id);
    expect(updatedPanel).toHaveAttribute("aria-labelledby", peopleTab.id);
  });

  it("keeps every tab reachable by keyboard, including inactive ones", () => {
    // Regression guard: a roving tabIndex (selected ? 0 : -1) without arrow-key
    // handling would remove the two inactive tabs from the tab order entirely,
    // making them unreachable by keyboard. These tabs are plain focusable
    // buttons (default tabIndex), not a roving-tabindex widget.
    renderTabs();
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).not.toHaveAttribute("tabIndex", "-1");
    }
  });
});
