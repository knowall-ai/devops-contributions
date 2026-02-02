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

type UserMode = "specific" | "all";

interface ExtendedFilter extends IContributionFilter {
  userMode: UserMode;
}

interface ConfigurationProps {
  filter: ExtendedFilter;
  onChange: (filter: ExtendedFilter) => void;
}

class ConfigurationPanel extends React.Component<ConfigurationProps, Record<string, never>> {
  render() {
    const { filter } = this.props;
    const userMode = filter.userMode || "specific";
    const userModeText = userMode === "specific" ? "Specific users" : "All contributors";

    return (
      <FluentProvider theme={webLightTheme}>
        <div className="configuration-panel">
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

          <div className="config-section">
            <Label className="config-label">Scope</Label>
            <Switch
              checked={filter.allProjects}
              label="All projects"
              onChange={(_e, data) => this.updateFilter({ allProjects: data.checked })}
            />
          </div>

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
        </div>
      </FluentProvider>
    );
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
          const baseFilter: IContributionFilter & Partial<{ userMode: UserMode }> =
            settings.filter || (await defaultFilter.getValue());
          const userMode: UserMode =
            ("userMode" in baseFilter && baseFilter.userMode) || "specific";
          currentFilter = { ...baseFilter, userMode };

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
