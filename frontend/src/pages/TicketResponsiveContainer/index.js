import React from "react";
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';

import Tickets from "../TicketsCustom"
import TicketAdvanced from "../TicketsAdvanced";

function TicketResponsiveContainer (props) {
    if (isWidthUp('md', props.width)) {
        return <Tickets />;
    }
    return (
        <div style={{
            marginTop: 35,
            height: "calc(100vh - 48px)",
            width: "100vw",
            minWidth: 0,
            maxWidth: "100vw",
            overflow: "hidden"
        }}>
            <TicketAdvanced />
        </div>
    );
}

export default withWidth()(TicketResponsiveContainer);