import * as React from "react";
import { ActivityCalendar, ThemeInput } from "react-activity-calendar";
import { IUserContributions } from "../data/contracts";

interface Activity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface WidgetGraphProps {
  contributions: IUserContributions;
}

// Green theme matching Zaplie styling
const theme: ThemeInput = {
  light: ["#1F1F1F", "#3a5e09", "#4d7a0c", "#6ba513", "#84cc16"],
  dark: ["#1F1F1F", "#3a5e09", "#4d7a0c", "#6ba513", "#84cc16"],
};

function transformContributions(contributions: IUserContributions): Activity[] {
  const activities: Activity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate date range for past year
  const startDate = new Date(today.getTime());
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(startDate.getDate() + 1);

  // Collect all counts to calculate levels
  const countsByDate: { [date: string]: number } = {};
  let maxCount = 0;

  const dayTimes = Object.keys(contributions.data);
  for (const dayTime of dayTimes) {
    const count = contributions.data[Number(dayTime)].length;
    const date = new Date(parseInt(dayTime, 10));
    const dateStr = date.toISOString().split("T")[0];
    countsByDate[dateStr] = count;
    if (count > maxCount) {
      maxCount = count;
    }
  }

  // Generate activities for each day in the range
  const current = new Date(startDate.getTime());
  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const count = countsByDate[dateStr] || 0;

    // Calculate level (0-4) based on thresholds
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0 && maxCount > 0) {
      const ratio = count / maxCount;
      if (ratio > 0.75) {
        level = 4;
      } else if (ratio > 0.5) {
        level = 3;
      } else if (ratio > 0.25) {
        level = 2;
      } else {
        level = 1;
      }
    }

    activities.push({
      date: dateStr,
      count,
      level,
    });

    current.setDate(current.getDate() + 1);
  }

  return activities;
}

export class WidgetGraph extends React.Component<WidgetGraphProps, Record<string, never>> {
  render() {
    const { contributions } = this.props;
    const activities = transformContributions(contributions);
    const { user } = contributions;

    // Calculate total contributions
    const totalContributions = activities.reduce((sum, a) => sum + a.count, 0);

    return (
      <div className="widget-graph">
        <div className="user-info">
          {user.imageUrl && (
            <img className="user-avatar" src={user.imageUrl} alt={user.displayName} />
          )}
          <div className="user-details">
            <span className="user-name">{user.displayName}</span>
            <span className="contribution-count">
              {totalContributions} contributions in the last year
            </span>
          </div>
        </div>
        <div className="calendar-container">
          <ActivityCalendar
            data={activities}
            theme={theme}
            blockSize={12}
            blockMargin={4}
            fontSize={14}
            showColorLegend={true}
            showTotalCount={false}
          />
        </div>
        <div className="calendar-footer">
          <div className="built-by">
            <a href="https://www.knowall.ai" target="_blank" rel="noopener noreferrer">
              Built by KnowAll AI
            </a>
          </div>
        </div>
      </div>
    );
  }
}
