"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Form} from "../ui/form";
import CustomFormField from "../CustomFormField";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Doctors} from "@/constant";
import {SelectItem} from "@/components/ui/select";
import Image from "next/image";
import SubmitButton from "@/components/SubmitButton";
import {createAppointment} from "@/lib/actions/appointment.actions";
import {getAppointmentSchema} from "@/lib/validation";

export enum FormFieldType {
    INPUT = "input",
    TEXTAREA = "textarea",
    PHONE_INPUT = "phoneInput",
    CHECKBOX = "checkbox",
    DATE_PICKER = "datePicker",
    SELECT = "select",
    SKELETON = "skeleton",
}

export default function AppointmentForm({
                                            userId, patientId, type
                                        }: {
    userId: string,
    patientId: string,
    type: "create" | "cancel" | "schedule"
}) {
    const router = useRouter();
    const [isLoading, setIsloading] = useState(false);
    const AppointmentFormValidation = getAppointmentSchema(type)
    const form = useForm<z.infer<typeof AppointmentFormValidation>>({
        resolver: zodResolver(AppointmentFormValidation),
        defaultValues: {
            primaryPhysician: "",
            schedule: "",
            reason: "",
            notes: "",
            cancellationReason: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof AppointmentFormValidation>) => {
        setIsloading(true);

        let status;
        switch (type) {
            case "schedule":
                status = "scheduled";
                break;
            case "cancel":
                status = "cancelled";
                break;
            default:
                status = "pending"
                break;
        }

        try {
            if (type === "create") {
                const appointmentData = {
                    userId, patient: patientId, primaryPhysician: values.primaryPhysician,
                    schedule: new Date(values.schedule),
                    reason: values.reason!,
                    note: values.note,
                    status: status as Status,
                }

                const appointment = await createAppointment(appointmentData);

                if (appointment) {
                    form.reset();
                    router.push(`/patients/${userId}/new-appointment/success?appointmentId=${appointment.$id}`);
                }
            }
        } catch (err) {
            console.log(err);
        }

        setIsloading(false);
    };

    let buttonLabel;

    switch (type) {
        case "cancel":
            buttonLabel = "Cancel Appointment";
            break;
        case "create":
            buttonLabel = "Create Appointment";
            break;
        case "schedule":
            buttonLabel = "Schedule Appointment";
            break;
        default:
            break
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 flex-1">
                <section className="mb-12 space-y-4">
                    <h1 className="header">New Appointment</h1>
                    <p>Request a new appointment in seconds</p>
                </section>
                {type !== "cancel" && (
                    <>
                        <CustomFormField fieldType={FormFieldType.SELECT} control={form.control}
                                         name={"primaryPhysician"}
                                         label={"Doctor"}
                                         placeholder={"Select a doctor"}>

                            {Doctors.map((doctor) => (
                                <SelectItem key={doctor.name} value={doctor.name}>
                                    <div className="flex cursor-pointer items-center gap-2">
                                        <Image
                                            src={doctor.image}
                                            width={32}
                                            height={32}
                                            alt={doctor.name}
                                            className=" rounded-full border border-dark-500"
                                        />
                                        <p>{doctor.name}</p>
                                    </div>
                                </SelectItem>
                            ))}
                        </CustomFormField>
                    </>
                )}

                <CustomFormField control={form.control} fieldType={FormFieldType.DATE_PICKER} name="schedule"
                                 label={"Expected appointment date"} showTimeSelect dateFormat={"MM/dd/yy - h:mm aa"}/>

                <div className={"flex flex-col gap-6 xl:flex-row"}>
                    <CustomFormField control={form.control} fieldType={FormFieldType.TEXTAREA} name={"reason"}
                                     label={"Reason for appointment"} placeholder={"Enter reason for appointment"}/>
                    <CustomFormField control={form.control} fieldType={FormFieldType.TEXTAREA} name={"notes"}
                                     label={"Notes"} placeholder={"Enter notes"}/>
                </div>

                {type === "cancel" && (
                    <CustomFormField control={form.control} fieldType={FormFieldType.TEXTAREA}
                                     name={"cancellationReason"}
                                     label={"Reason for cancellation"} placeholder={"Enter reason for cancellation"}/>
                )}
                <SubmitButton isLoading={isLoading}
                              className={`${type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"}`}>{buttonLabel}</SubmitButton>
            </form>
        </Form>
    );
}
