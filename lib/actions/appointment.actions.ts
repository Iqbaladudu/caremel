"use server"

import {APPOINTMENT_COLLECTION_ID, DATABASE_ID, databases, messaging} from "@/lib/appwrite.config";
import {ID, Query} from "node-appwrite";
import {formatDateTime, parseStringify} from "@/lib/utils";
import {Appointment} from "@/types/appwrite.type";
import {CreateAppointmentParams, UpdateAppointmentParams} from "@/types";
import {revalidatePath} from "next/cache";


export const createAppointment = async (appointment: CreateAppointmentParams) => {
    try {
        const newAppointment = await databases.createDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            ID.unique(),
            appointment
        );

        return parseStringify(newAppointment);
    } catch (e) {
        console.log(e);
    }
}

export const getAppointment = async (appointmentId: string) => {
    try {
        const appointment = await databases.getDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId
        )

        return parseStringify(appointment);
    } catch (e) {
        console.log(e)
    }
}

export const getRecentAppointmentList = async () => {
    try {
        const appointment = await databases.listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [Query.orderDesc('$createdAt')])
        const initialCounts = {
            scheduledCount: 0,
            pendingCount: 0,
            cancelledCount: 0,
        }

        const counts = (appointment.documents as Appointment[]).reduce(
            (acc, appointment) => {
                switch (appointment.status) {
                    case "scheduled":
                        acc.scheduledCount++;
                        break;
                    case "pending":
                        acc.pendingCount++;
                        break;
                    case "cancelled":
                        acc.cancelledCount++;
                        break;
                }
                return acc;
            },
            initialCounts
        );

        const data = {
            totalCount: appointment.total,
            ...counts,
            documents: appointment.documents,
        };

        return parseStringify(data);

    } catch (e) {
        console.log(e)
    }
}

export const updateAppointment = async ({
                                            appointmentId,
                                            userId,
                                            timeZone,
                                            appointment,
                                            type,
                                        }: UpdateAppointmentParams) => {
    try {
        // Update appointment to scheduled -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#updateDocument
        const updatedAppointment = await databases.updateDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId,
            appointment
        );

        if (!updatedAppointment) throw Error;

        const smsMessage = `Greetings from CarePulse. ${type === "schedule" ? `Your appointment is confirmed for ${formatDateTime(appointment.schedule!, timeZone).dateTime} with Dr. ${appointment.primaryPhysician}` : `We regret to inform that your appointment for ${formatDateTime(appointment.schedule!, timeZone).dateTime} is cancelled. Reason:  ${appointment.cancellationReason}`}.`;
        await sendSMSNotification(userId, smsMessage);

        revalidatePath("/admin");
        return parseStringify(updatedAppointment);
    } catch (error) {
        console.error("An error occurred while scheduling an appointment:", error);
    }
};

export const sendSMSNotification = async (userId: string, content: string) => {
    try {
        // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
        const message = await messaging.createSms(
            ID.unique(),
            content,
            [],
            [userId]
        );
        return parseStringify(message);
    } catch (error) {
        console.error("An error occurred while sending sms:", error);
    }
};
