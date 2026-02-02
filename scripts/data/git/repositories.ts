import { CachedValue } from "../CachedValue";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { getClient } from "TFS/VersionControl/GitRestClient";

export const repositoriesVal = new CachedValue(() => getClient().getRepositories());

function getSortedRepos() {
  return repositoriesVal
    .getValue()
    .then((repositories) => repositories.sort((a, b) => a.name.localeCompare(b.name)));
}
const sortedRepos = new CachedValue(getSortedRepos);

export function getDefaultRepository(): Promise<GitRepository | undefined> {
  const projName = VSS.getWebContext().project.name;
  return sortedRepos.getValue().then((repositories) => {
    if (projName === "VSOnline") {
      const [repo] = repositories.filter((r) => r.name === "VSO" && r.project.name === "VSOnline");
      if (repo) {
        return repo;
      }
    }
    return repositories.filter((r) => r.name === projName)[0] || repositories[0];
  });
}
export const defaultRepostory = new CachedValue(getDefaultRepository);
