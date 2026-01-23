import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { Icons } from "../assets/icons.js";

const { div, button, span } = van.tags;

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

export const NotificationHistory = () => {
    const isOpen = van.state(false);

    const toggleDropdown = (e) => {
        e.stopPropagation();
        isOpen.val = !isOpen.val;
    };

    const handleClickOutside = (e) => {
        if (isOpen.val && !e.target.closest(".notification-history")) {
            isOpen.val = false;
        }
    };

    document.addEventListener("click", handleClickOutside);

    return div(
        { class: "notification-history" },
        button(
            {
                class: "notification-history-toggle",
                onclick: toggleDropdown,
                "aria-label": "Notification history",
                title: "Notification history",
            },
            Icons.Bell()
        ),
        () => {
            if (!isOpen.val) return span({ style: "display: none;" });

            const history = store.app.notificationHistory;

            if (history.length === 0) {
                return div(
                    { class: "notification-history-dropdown" },
                    div({ class: "notification-history-empty" }, "No notifications yet")
                );
            }

            return div(
                { class: "notification-history-dropdown" },
                ...history.map((notification) =>
                    div(
                        {
                            class: `notification-history-item ${notification.type === "error" ? "is-error" : "is-success"}`,
                        },
                        span({ class: "notification-history-indicator" }),
                        span({ class: "notification-history-message" }, notification.message),
                        span({ class: "notification-history-time" }, formatTime(notification.id))
                    )
                )
            );
        }
    );
};
