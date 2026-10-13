import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router';

import { isCercleHomeEnabled } from '/@/renderer/features/cercle/utils/cercle-env';

// Only the first visit to "/" per page load is redirected, so the Feishin home page stays
// reachable from the sidebar afterwards.
let redirected = false;

const RedirectToCercle = () => {
    const navigate = useNavigate();

    useEffect(() => {
        redirected = true;
        navigate('/cercle', { replace: true });
    }, [navigate]);

    return null;
};

// With CERCLE_HOME=true the app opens on the Cercle feed instead of the Feishin home page.
export const CercleHomeRedirect = ({ children }: { children: ReactNode }) => {
    if (isCercleHomeEnabled() && !redirected) {
        return <RedirectToCercle />;
    }

    return <>{children}</>;
};
