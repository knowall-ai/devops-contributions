import * as React from "react";
import { Combobox, Option, Tag, TagGroup } from "@fluentui/react-components";
import { Dismiss12Regular } from "@fluentui/react-icons";
import { repositoriesVal } from "../data/git/repositories";

export interface IRepository {
  id: string;
  name: string;
  projectName: string;
}

export interface IRepositoryPickerProps {
  repositories: IRepository[];
  allProjects?: boolean;
  width?: number | string;
  placeholder?: string;
  onRepositoriesChanged?: (repositories: IRepository[]) => void;
  readOnly?: boolean;
}

interface RepositoryPickerState {
  query: string;
  suggestions: IRepository[];
  loading: boolean;
}

export class RepositoryPicker extends React.Component<
  IRepositoryPickerProps,
  RepositoryPickerState
> {
  private searchRequestId = 0;

  constructor(props: IRepositoryPickerProps) {
    super(props);
    this.state = {
      query: "",
      suggestions: [],
      loading: false,
    };
  }

  private async searchRepositories(filter: string): Promise<IRepository[]> {
    const lowerFilter = filter.toLocaleLowerCase();
    const allRepos = await repositoriesVal.getValue();
    const currentProjectId = VSS.getWebContext().project.id;

    let filtered = allRepos;

    // Filter by project if not showing all projects
    if (!this.props.allProjects) {
      filtered = filtered.filter((r) => r.project.id === currentProjectId);
    }

    // Filter by search term
    if (filter) {
      filtered = filtered.filter((r) => r.name.toLocaleLowerCase().includes(lowerFilter));
    }

    // Exclude already selected
    const selectedIds = new Set(this.props.repositories.map((r) => r.id));
    filtered = filtered.filter((r) => !selectedIds.has(r.id));

    // Sort and limit
    return filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        name: r.name,
        projectName: r.project.name,
      }));
  }

  private async handleInputChange(value: string) {
    const requestId = ++this.searchRequestId;
    this.setState({ query: value, loading: true });
    const suggestions = await this.searchRepositories(value);
    // Only update if this is still the latest request (prevents race conditions)
    if (requestId === this.searchRequestId) {
      this.setState({ suggestions, loading: false });
    }
  }

  private handleSelect(_e: unknown, data: { optionValue?: string }) {
    if (!data.optionValue) {
      return;
    }

    const selectedRepo = this.state.suggestions.find((r) => r.id === data.optionValue);

    if (selectedRepo && this.props.onRepositoriesChanged) {
      const existing = this.props.repositories || [];
      if (!existing.find((r) => r.id === selectedRepo.id)) {
        this.props.onRepositoriesChanged([...existing, selectedRepo]);
      }
    }

    this.setState({ query: "" });
  }

  private handleRemove(repoId: string) {
    if (this.props.onRepositoriesChanged) {
      const updated = this.props.repositories.filter((r) => r.id !== repoId);
      this.props.onRepositoriesChanged(updated);
    }
  }

  componentDidMount() {
    this.handleInputChange("");
  }

  componentDidUpdate(prevProps: IRepositoryPickerProps) {
    // Refresh suggestions when allProjects changes
    if (prevProps.allProjects !== this.props.allProjects) {
      this.handleInputChange(this.state.query);
    }
  }

  render() {
    const { repositories, placeholder, readOnly, width } = this.props;
    const { query, suggestions, loading } = this.state;

    return (
      <div className="repository-picker" style={{ width: width || "100%" }}>
        {/* Selected repositories as tags */}
        {repositories && repositories.length > 0 && (
          <TagGroup
            onDismiss={(_e, data) => this.handleRemove(data.value)}
            style={{ marginBottom: 8, flexWrap: "wrap", gap: 4 }}
          >
            {repositories.map((repo) => (
              <Tag
                key={repo.id}
                value={repo.id}
                dismissible={!readOnly}
                dismissIcon={<Dismiss12Regular />}
              >
                {repo.name}
              </Tag>
            ))}
          </TagGroup>
        )}

        {/* Search combobox */}
        {!readOnly && (
          <Combobox
            placeholder={placeholder || "Search repositories..."}
            value={query}
            onChange={(e) => this.handleInputChange(e.target.value)}
            onOptionSelect={(e, data) => this.handleSelect(e, data)}
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
              suggestions.map((repo) => (
                <Option key={repo.id} value={repo.id} text={repo.name}>
                  <span>{repo.name}</span>
                  {this.props.allProjects && (
                    <span style={{ color: "#666", marginLeft: 8, fontSize: 12 }}>
                      ({repo.projectName})
                    </span>
                  )}
                </Option>
              ))
            )}
          </Combobox>
        )}
      </div>
    );
  }
}
