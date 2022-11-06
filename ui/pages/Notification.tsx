import React, { useState, useEffect } from 'react';

export default function Notification(props: any) {

    return (
        <div className={"offcentered"}>
            {props.message}
        </div>
    );
}
