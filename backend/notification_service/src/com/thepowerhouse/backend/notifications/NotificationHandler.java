package com.thepowerhouse.backend.notifications;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * Handles dispatching of high-priority system notifications.
 * Integrated into the Powerhouse application ecosystem.
 */
public class NotificationHandler {
    private static final Logger LOGGER = Logger.getLogger(NotificationHandler.class.getName());
    private List<String> messageQueue;

    public NotificationHandler() {
        this.messageQueue = new ArrayList<>();
    }

    public void queueMessage(String recipient, String message) {
        String payload = String.format("[%s] To: %s | Body: %s", LocalDateTime.now(), recipient, message);
        this.messageQueue.add(payload);
        LOGGER.info("Message queued: " + payload);
    }

    public void processQueue() {
        if (messageQueue.isEmpty()) {
            LOGGER.info("No messages to process.");
            return;
        }

        for (String msg : messageQueue) {
            // Simulation of email/SMS dispatch
            System.out.println("DISPATCHING >>> " + msg);
        }
        messageQueue.clear();
    }

    public static void main(String[] args) {
        NotificationHandler service = new NotificationHandler();
        service.queueMessage("admin@thepowerhouse.com", "Server load at 85%");
        service.queueMessage("user@example.com", "Your choir rehearsal is starting soon.");
        service.processQueue();
    }
}
