import { gql } from '@apollo/client';

const CURRENT_PRESENTATION_PAGE_SUBSCRIPTION = gql`
  subscription currentPresentationPagesSubscription {
    pres_page_curr {
      svgUrl: urlsJson(path: "$.png")
    }
  }
`;

export default {
  CURRENT_PRESENTATION_PAGE_SUBSCRIPTION
};
