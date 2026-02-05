import { Global } from "@emotion/react";

export const DatePickerStyles = () => (
  <Global
    styles={`
      .react-datepicker {
        font-family: inherit;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .react-datepicker__header {
        background: linear-gradient(to right, #38A169, #319795);
        border-bottom: none;
        border-radius: 12px 12px 0 0;
        padding-top: 12px;
      }
      .react-datepicker__current-month {
        color: white;
        font-weight: bold;
        font-size: 1rem;
      }
      .react-datepicker__day-name {
        color: white;
        font-weight: 500;
      }
      .react-datepicker__day {
        border-radius: 8px;
        transition: all 0.2s;
      }
      .react-datepicker__day:hover {
        background-color: #EDF2F7;
      }
      .react-datepicker__day--selected {
        background-color: #38A169 !important;
        color: white !important;
      }
      .react-datepicker__day--keyboard-selected {
        background-color: #68D391;
      }
      .react-datepicker__day--disabled {
        color: #CBD5E0 !important;
        background-color: #F7FAFC !important;
        cursor: not-allowed;
      }
      .weekend-day {
        color: #A0AEC0 !important;
        background-color: #F7FAFC !important;
      }
      .react-datepicker__navigation {
        top: 12px;
      }
      .react-datepicker__navigation-icon::before {
        border-color: white;
      }
      .react-datepicker__triangle {
        display: none;
      }
    `}
  />
);
