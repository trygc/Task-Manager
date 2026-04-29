/* eslint-disable react-refresh/only-export-components */
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";

const App = dynamic(() => import("@/App"), {
  ssr: false,
});

const REMOVED_ROUTE_REDIRECTS: Record<string, string> = {
  "campaign-overview": "/campaigns",
  "campaign-intake": "/campaigns",
  mistakes: "/tasks",
  "update-organizer": "/tasks",
  handover: "/tasks",
  functions: "/tasks",
  ops: "/campaigns",
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params.slug.join("/") : "";
  const destination = REMOVED_ROUTE_REDIRECTS[slug];

  if (destination) {
    return {
      redirect: {
        destination,
        permanent: false,
      },
    };
  }

  return { props: {} };
};

export default function CatchAllPage() {
  return <App />;
}
