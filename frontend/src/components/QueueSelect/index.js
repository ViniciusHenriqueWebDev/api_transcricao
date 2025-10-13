import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Chip from "@material-ui/core/Chip";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
    chips: {
        display: "flex",
        flexWrap: "wrap",
    },
    chip: {
        margin: 2,
    },
    formControl: {
        margin: 0,
        width: '100%',
    },
    select: {
        height: '40px', // Define uma altura fixa igual à dos outros inputs
    },
    inputRoot: {
        height: '40px', // Ajusta altura do input interno
    },
    selectMenu: {
        minHeight: '40px', // Garante altura mínima
        maxHeight: '40px', // Limita altura máxima
        display: 'flex',
        alignItems: 'center',
    },
    inputLabel: {
        transform: 'translate(14px, 12px) scale(1)', // Ajusta a posição do label
    }
}));

const QueueSelect = ({ selectedQueueIds, onChange }) => {
    const classes = useStyles();
    const [queues, setQueues] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/queue");
                setQueues(data);
            } catch (err) {
                toastError(err);
            }
        })();
    }, []);

    const handleChange = e => {
        onChange(e.target.value);
    };

    return (
        <FormControl 
            fullWidth 
            variant="outlined"
            className={classes.formControl}
        >
            <InputLabel 
                className={classes.inputLabel} 
                shrink={false}
            >
                Filas
            </InputLabel>
            <Select
                multiple
                labelWidth={60}
                value={selectedQueueIds}
                onChange={handleChange}
                className={classes.select}
                classes={{
                    root: classes.inputRoot,
                    selectMenu: classes.selectMenu
                }}
                MenuProps={{
                    anchorOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                    },
                    transformOrigin: {
                        vertical: "top",
                        horizontal: "left",
                    },
                    getContentAnchorEl: null,
                }}
                renderValue={selected => (
                    <div className={classes.chips}>
                    
                        {selected?.length > 0 &&
                            selected.map(id => {
                                if (id === "0") {
                                    return (
                                        <Chip
                                            key={id}
                                            size="small"
                                            label={i18n.t("queueSelect.withoutQueue")}
                                            className={classes.chip}
                                        />
                                    );
                                }
                                const queue = queues.find(q => q.id === id);
                                return queue ? (
                                    <Chip
                                        key={id}
                                        style={{ backgroundColor: queue.color }}
                                        variant="outlined"
                                        size="small"
                                        label={queue.name}
                                        className={classes.chip}
                                    />
                                ) : null;
                            })}
                    </div>
                )}
            >
                <MenuItem value="0">
                    {i18n.t("queueSelect.withoutQueue")}
                </MenuItem>
                {queues.map(queue => (
                    <MenuItem key={queue.id} value={queue.id}>
                        {queue.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default QueueSelect;