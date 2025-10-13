import React, { useState } from "react";

import Paper from "@material-ui/core/Paper";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Skeleton from "@material-ui/lab/Skeleton";
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';

import { makeStyles } from "@material-ui/core/styles";
import { green, red } from '@material-ui/core/colors';

import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import FilterListIcon from '@material-ui/icons/FilterList';
import PeopleIcon from '@material-ui/icons/People';
import PersonIcon from '@material-ui/icons/Person';
import moment from 'moment';

import Rating from '@material-ui/lab/Rating';

const useStyles = makeStyles(theme => ({
    on: {
        color: green[600],
        fontSize: '20px'
    },
    off: {
        color: red[600],
        fontSize: '20px'
    },
    pointer: {
        cursor: "pointer"
    },
    filterContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing(1, 2),
        borderBottom: `1px solid ${theme.palette.divider}`
    },
    filterIcon: {
        marginRight: theme.spacing(1),
        fontSize: '1.2rem',
        verticalAlign: 'middle'
    },
    toggleButton: {
        padding: theme.spacing(0.5, 1.5)
    }
}));

export function RatingBox ({ rating }) {
    const ratingTrunc = rating === null ? 0 : Math.trunc(rating);
    return <Rating
        defaultValue={ratingTrunc}
        max={3}
        readOnly
    />
}

export default function TableAttendantsStatus(props) {
    const { loading, attendants } = props;
    const classes = useStyles();
    // Estado para controlar o filtro atual
    const [statusFilter, setStatusFilter] = useState('all');

    // Manipulador de evento para mudança no filtro
    const handleFilterChange = (event, newFilter) => {
        // Evita desselecionar todos os filtros
        if (newFilter !== null) {
            setStatusFilter(newFilter);
        }
    };

    // Filtra os atendentes com base no statusFilter
    const filteredAttendants = attendants.filter(a => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'online') return a.online;
        if (statusFilter === 'offline') return !a.online;
        return true;
    });

    function renderList() {
        return filteredAttendants.map((a, k) => (
            <TableRow key={k}>
                <TableCell>{a.name}</TableCell>
                <TableCell align="center" title="1 - Insatisfeito, 2 - Satisfeito, 3 - Muito Satisfeito" className={classes.pointer}>
                    <RatingBox rating={a.rating} />
                </TableCell>
                <TableCell align="center">{formatTime(a.avgSupportTime, 2)}</TableCell>
                <TableCell align="center">
                    { a.online ?
                        <CheckCircleIcon className={classes.on} />
                        : <ErrorIcon className={classes.off} />
                    }
                </TableCell>
            </TableRow>
        ));
    }

    function formatTime(minutes) {
        return moment().startOf('day').add(minutes, 'minutes').format('HH[h] mm[m]');
    }

    // Conta quantos atendentes estão online e offline para mostrar nas tabs
    const onlineCount = attendants.filter(a => a.online).length;
    const offlineCount = attendants.filter(a => !a.online).length;

    return (!loading ? (
        <Paper>
            {/* Barra de filtro */}
            <Box className={classes.filterContainer}>
                <Typography variant="subtitle2">
                    <FilterListIcon className={classes.filterIcon} />
                    Filtrar por status
                </Typography>
                <ToggleButtonGroup
                    value={statusFilter}
                    exclusive
                    onChange={handleFilterChange}
                    aria-label="filtro de status"
                    size="small"
                >
                    <ToggleButton value="all" aria-label="todos os atendentes" className={classes.toggleButton}>
                        <PeopleIcon fontSize="small" style={{ marginRight: 4 }} />
                        Todos ({attendants.length})
                    </ToggleButton>
                    <ToggleButton value="online" aria-label="atendentes online" className={classes.toggleButton}>
                        <CheckCircleIcon fontSize="small" style={{ marginRight: 4, color: green[600] }} />
                        Online ({onlineCount})
                    </ToggleButton>
                    <ToggleButton value="offline" aria-label="atendentes offline" className={classes.toggleButton}>
                        <ErrorIcon fontSize="small" style={{ marginRight: 4, color: red[600] }} />
                        Offline ({offlineCount})
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell align="center">Avaliações</TableCell>
                            <TableCell align="center">T.M. de Atendimento</TableCell>
                            <TableCell align="center">Status (Atual)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAttendants.length > 0 ? (
                            renderList()
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    Nenhum atendente encontrado com este status.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    ) : (
        <Skeleton variant="rect" height={150} />
    ));
}