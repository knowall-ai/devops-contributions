import * as React from "react";
import {
  Combobox,
  Option,
  Persona,
  Tag,
  TagGroup,
  ComboboxProps,
} from "@fluentui/react-components";
import { Dismiss12Regular } from "@fluentui/react-icons";
import { getIdentities } from "../data/identities/getIdentities";
import { CachedValue } from "../data/CachedValue";

export interface IIdentity {
  displayName: string;
  id: string;
  uniqueName: string;
  imageUrl: string;
}

export interface IIdentityPickerProps {
  identities: IIdentity[];
  width?: number | string;
  placeholder?: string;
  onIdentityChanged?: (identities: IIdentity[]) => void;
  onIdentityCleared?: () => void;
  readOnly?: boolean;
  forceValue?: boolean;
}

// Cache for all identities
const identitiesCache = new CachedValue(async () => {
  const identitiesMap = await getIdentities();
  const identities: IIdentity[] = [];
  for (const id in identitiesMap) {
    const identity = identitiesMap[id];
    identities.push({
      displayName: identity.displayName,
      uniqueName: identity.uniqueName,
      imageUrl: identity.imageUrl,
      id: identity.id,
    });
  }
  return identities;
});

interface IdentityPickerState {
  query: string;
  suggestions: IIdentity[];
  loading: boolean;
}

export class IdentityPicker extends React.Component<IIdentityPickerProps, IdentityPickerState> {
  private comboboxId = `identity-picker-${Math.random().toString(36).substr(2, 9)}`;

  constructor(props: IIdentityPickerProps) {
    super(props);
    this.state = {
      query: "",
      suggestions: [],
      loading: false,
    };
  }

  private async searchIdentities(filter: string): Promise<IIdentity[]> {
    const lowerFilter = filter.toLocaleLowerCase();
    const allIdentities = await identitiesCache.getValue();

    if (!filter) {
      return allIdentities.slice(0, 10); // Show first 10 when no filter
    }

    return allIdentities.filter(
      (identity) =>
        identity.displayName.toLocaleLowerCase().includes(lowerFilter) ||
        identity.uniqueName.toLocaleLowerCase().includes(lowerFilter)
    );
  }

  private handleInputChange = async (value: string) => {
    this.setState({ query: value, loading: true });
    const suggestions = await this.searchIdentities(value);
    this.setState({ suggestions, loading: false });
  };

  private handleSelect: ComboboxProps["onOptionSelect"] = (_e, data) => {
    if (!data.optionValue) return;

    const selectedIdentity = this.state.suggestions.find((i) => i.id === data.optionValue);

    if (selectedIdentity && this.props.onIdentityChanged) {
      // Add to existing selections (avoid duplicates)
      const existing = this.props.identities || [];
      if (!existing.find((i) => i.id === selectedIdentity.id)) {
        this.props.onIdentityChanged([...existing, selectedIdentity]);
      }
    }

    // Clear the search
    this.setState({ query: "" });
  };

  private handleRemove = (identityId: string) => {
    if (this.props.onIdentityChanged) {
      const updated = this.props.identities.filter((i) => i.id !== identityId);
      this.props.onIdentityChanged(updated);
    }
  };

  componentDidMount() {
    // Load initial suggestions
    this.handleInputChange("");
  }

  render() {
    const { identities, placeholder, readOnly, width } = this.props;
    const { query, suggestions, loading } = this.state;

    return (
      <div className="identity-picker" style={{ width: width || "100%" }}>
        {/* Selected identities as tags */}
        {identities && identities.length > 0 && (
          <TagGroup
            onDismiss={(_e, data) => this.handleRemove(data.value)}
            style={{ marginBottom: 8, flexWrap: "wrap", gap: 4 }}
          >
            {identities.map((identity) => (
              <Tag
                key={identity.id}
                value={identity.id}
                dismissible={!readOnly}
                dismissIcon={<Dismiss12Regular />}
                media={
                  <Persona
                    avatar={{ image: { src: identity.imageUrl } }}
                    size="extra-small"
                    name=""
                  />
                }
              >
                {identity.displayName}
              </Tag>
            ))}
          </TagGroup>
        )}

        {/* Search combobox */}
        {!readOnly && (
          <Combobox
            id={this.comboboxId}
            placeholder={placeholder || "Search for users..."}
            value={query}
            onChange={(e) => this.handleInputChange(e.target.value)}
            onOptionSelect={this.handleSelect}
            freeform
            style={{ width: "100%" }}
          >
            {loading ? (
              <Option key="loading" disabled text="Loading...">
                Loading...
              </Option>
            ) : suggestions.length === 0 ? (
              <Option key="no-results" disabled text="No results">
                No results found
              </Option>
            ) : (
              suggestions.map((identity) => (
                <Option key={identity.id} value={identity.id} text={identity.displayName}>
                  <Persona
                    avatar={{ image: { src: identity.imageUrl } }}
                    name={identity.displayName}
                    secondaryText={identity.uniqueName}
                    size="small"
                  />
                </Option>
              ))
            )}
          </Combobox>
        )}
      </div>
    );
  }
}
