///<reference types="vss-web-extension-sdk" />
import "promise-polyfill/src/polyfill";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import {
  Switch,
  Dropdown,
  Option,
  FluentProvider,
  webLightTheme,
  Label,
} from "@fluentui/react-components";

import { ContributionName } from "./data/contracts";
import { defaultFilter, IContributionFilter } from "./filter";
import { IdentityPicker } from "./controls/IdentityPicker";
import { RepositoryPicker, IRepository } from "./controls/RepositoryPicker";

type UserMode = "specific" | "all";
type RepoMode = "specific" | "all";

interface ExtendedFilter extends IContributionFilter {
  userMode: UserMode;
  repoMode: RepoMode;
  showFiltersOnWidget: boolean;
}

interface ConfigurationProps {
  filter: ExtendedFilter;
  onChange: (filter: ExtendedFilter) => void;
}

class ConfigurationPanel extends React.Component<ConfigurationProps, Record<string, never>> {
  render() {
    const { filter } = this.props;
    const userMode = filter.userMode || "specific";
    const repoMode = filter.repoMode || "all";
    const userModeText = userMode === "specific" ? "Specific users" : "All contributors";
    const repoModeText = repoMode === "specific" ? "Specific repositories" : "All repositories";

    return (
      <FluentProvider theme={webLightTheme}>
        <div className="configuration-panel">
          {/* User Selection */}
          <div className="config-section">
            <Label className="config-label">Show contributions for</Label>
            <Dropdown
              value={userModeText}
              onOptionSelect={(_e, data) =>
                this.updateFilter({ userMode: (data.optionValue as UserMode) || "specific" })
              }
            >
              <Option value="specific">Specific users</Option>
              <Option value="all">All contributors</Option>
            </Dropdown>
          </div>

          {userMode === "specific" && (
            <div className="config-section">
              <Label className="config-label">Users</Label>
              <IdentityPicker
                identities={filter.identities}
                onIdentityChanged={(identities) => {
                  this.updateFilter({ identities });
                }}
                forceValue={true}
                width={280}
                placeholder="Search for a user..."
              />
            </div>
          )}

          {/* Repository Selection */}
          <div className="config-section">
            <Label className="config-label">Repositories</Label>
            <Dropdown
              value={repoModeText}
              onOptionSelect={(_e, data) =>
                this.updateFilter({ repoMode: (data.optionValue as RepoMode) || "all" })
              }
            >
              <Option value="all">All repositories</Option>
              <Option value="specific">Specific repositories</Option>
            </Dropdown>
          </div>

          {repoMode === "specific" && (
            <div className="config-section">
              <RepositoryPicker
                repositories={this.getSelectedRepos()}
                allProjects={filter.allProjects}
                onRepositoriesChanged={(repos) => {
                  const repositories = repos.map((r) => ({ key: r.id, name: r.name }));
                  this.updateFilter({ repositories });
                }}
                width={280}
                placeholder="Search for a repository..."
              />
            </div>
          )}

          {/* Scope */}
          <div className="config-section">
            <Label className="config-label">Scope</Label>
            <Switch
              checked={filter.allProjects}
              label="All projects"
              onChange={(_e, data) => this.updateFilter({ allProjects: data.checked })}
            />
          </div>

          {/* Contribution Types */}
          <div className="config-section">
            <Label className="config-label">Contribution Types</Label>
            <div className="provider-toggles">
              {this.renderProviderToggle("Commits", "Commit")}
              {this.renderProviderToggle("Created PRs", "CreatePullRequest")}
              {this.renderProviderToggle("Closed PRs", "ClosePullRequest")}
              {this.renderProviderToggle("Reviewed PRs", "ReviewPullRequest")}
              {this.renderProviderToggle("Created Work Items", "CreateWorkItem")}
              {this.renderProviderToggle("Resolved Work Items", "ResolveWorkItem")}
              {this.renderProviderToggle("Closed Work Items", "CloseWorkItem")}
              {this.renderProviderToggle("Changesets (TFVC)", "Changeset")}
            </div>
          </div>

          {/* Widget Display Options */}
          <div className="config-section">
            <Label className="config-label">Widget Display</Label>
            <Switch
              checked={filter.showFiltersOnWidget || false}
              label="Show filters on widget"
              onChange={(_e, data) => this.updateFilter({ showFiltersOnWidget: data.checked })}
            />
          </div>
        </div>
      </FluentProvider>
    );
  }

  private getSelectedRepos(): IRepository[] {
    const { repositories } = this.props.filter;
    if (!repositories) return [];
    return repositories.map((r) => ({
      id: r.key,
      name: r.name,
      projectName: "", // We don't store project name, but it's not needed for display
    }));
  }

  private renderProviderToggle(label: string, provider: ContributionName) {
    const { filter } = this.props;
    return (
      <Switch
        key={provider}
        checked={filter.enabledProviders[provider]}
        label={label}
        onChange={(_e, data) => this.updateProvider(provider, data.checked)}
      />
    );
  }

  private updateFilter(partial: Partial<ExtendedFilter>) {
    const updatedFilter = { ...this.props.filter, ...partial };
    this.props.onChange(updatedFilter);
  }

  private updateProvider(provider: ContributionName, enabled: boolean) {
    const enabledProviders = { ...this.props.filter.enabledProviders };
    enabledProviders[provider] = enabled;
    this.updateFilter({ enabledProviders });
  }
}

interface WidgetSettings {
  filter: ExtendedFilter;
}

function parseSettings(customSettings: string | null): WidgetSettings {
  if (customSettings) {
    try {
      return JSON.parse(customSettings);
    } catch (e) {
      console.warn("Failed to parse widget settings:", e);
    }
  }
  return { filter: null as unknown as ExtendedFilter };
}

VSS.require(
  ["TFS/Dashboards/WidgetHelpers"],
  (WidgetHelpers: typeof import("TFS/Dashboards/WidgetHelpers")) => {
    WidgetHelpers.IncludeWidgetConfigurationStyles();

    VSS.register("ContributionsWidget-Configuration", () => {
      const container = document.querySelector(".configuration-container");
      let root: Root | null = null;
      let currentFilter: ExtendedFilter;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let notifyChange: (eventName: string, eventArgs: any) => void;

      const handleFilterChange = (filter: ExtendedFilter) => {
        currentFilter = filter;

        // Re-render the panel
        root?.render(<ConfigurationPanel filter={filter} onChange={handleFilterChange} />);

        // Notify the widget of the change
        if (notifyChange) {
          const settings: WidgetSettings = { filter };
          notifyChange(
            WidgetHelpers.WidgetEvent.ConfigurationChange,
            WidgetHelpers.WidgetEvent.Args({
              data: JSON.stringify(settings),
            })
          );
        }
      };

      return {
        load: async (
          widgetSettings: { customSettings: { data: string | null } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          widgetConfigurationContext: any
        ) => {
          notifyChange = widgetConfigurationContext.notify.bind(widgetConfigurationContext);

          const settings = parseSettings(widgetSettings.customSettings.data);
          const baseFilter: IContributionFilter &
            Partial<{ userMode: UserMode; repoMode: RepoMode; showFiltersOnWidget: boolean }> =
            settings.filter || (await defaultFilter.getValue());
          const userMode: UserMode =
            ("userMode" in baseFilter && baseFilter.userMode) || "specific";
          const repoMode: RepoMode = ("repoMode" in baseFilter && baseFilter.repoMode) || "all";
          const showFiltersOnWidget: boolean =
            ("showFiltersOnWidget" in baseFilter && baseFilter.showFiltersOnWidget) || false;
          currentFilter = { ...baseFilter, userMode, repoMode, showFiltersOnWidget };

          if (!root && container) {
            root = createRoot(container);
          }
          root?.render(<ConfigurationPanel filter={currentFilter} onChange={handleFilterChange} />);

          return WidgetHelpers.WidgetStatusHelper.Success();
        },
        onSave: () => {
          const settings: WidgetSettings = { filter: currentFilter };
          return WidgetHelpers.WidgetConfigurationSave.Valid({
            data: JSON.stringify(settings),
          });
        },
      };
    });

    VSS.notifyLoadSucceeded();
  }
);
