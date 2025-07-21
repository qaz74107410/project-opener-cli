#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

// Configuration file path
const CONFIG_FILE = path.join(os.homedir(), '.project-opener.json');

// Default configuration
let config = {
  projects: [],
  companies: {},
  vscodeCommand: 'code', // Default command to open VSCode
  projectsBasePath: os.homedir() // Default base path for projects
};

// Load configuration if exists
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
      
      // Ensure companies object exists for backward compatibility
      if (!config.companies) {
        config.companies = {};
      }
    } else {
      // Create default config if it doesn't exist
      saveConfig();
    }
  } catch (error) {
    console.error(chalk.red('Error loading configuration:'), error.message);
  }
}

// Save configuration
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log(chalk.green('Configuration saved successfully.'));
  } catch (error) {
    console.error(chalk.red('Error saving configuration:'), error.message);
  }
}

// Convert relative path to absolute path
function resolvePathToAbsolute(inputPath) {
  if (path.isAbsolute(inputPath)) {
    // Path is already absolute
    return inputPath;
  } else if (inputPath.startsWith('~')) {
    // Path is relative to home directory
    return inputPath.replace(/^~/, os.homedir());
  } else {
    // Path is relative to current directory
    return path.resolve(process.cwd(), inputPath);
  }
}

// Add a project
function addProject(name, projectPath, company = null) {
  const absolutePath = resolvePathToAbsolute(projectPath);
  
  // Verify the path exists
  if (!fs.existsSync(absolutePath)) {
    console.warn(chalk.yellow(`Warning: Path does not exist: ${absolutePath}`));
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue anyway?',
          default: false
        }
      ])
      .then(answers => {
        if (answers.continue) {
          saveProjectPath(name, absolutePath, company);
        } else {
          console.log(chalk.yellow('Project not added.'));
        }
      });
  } else {
    saveProjectPath(name, absolutePath, company);
  }
}

// Helper function to save project path
function saveProjectPath(name, absolutePath, company = null) {
  // Add project to main list
  const existingProject = config.projects.find(p => p.name === name);
  
  const projectData = {
    name,
    path: absolutePath,
    company: company
  };
  
  if (existingProject) {
    // Update existing project
    Object.assign(existingProject, projectData);
    console.log(chalk.green(`Updated project: ${name}`));
  } else {
    // Add new project
    config.projects.push(projectData);
    console.log(chalk.green(`Added project: ${name}`));
  }
  
  // Add to company mapping if provided
  if (company) {
    if (!config.companies[company]) {
      config.companies[company] = [];
    }
    
    // Only add if not already in the company list
    if (!config.companies[company].includes(name)) {
      config.companies[company].push(name);
    }
  }
  
  saveConfig();
}

// Remove a project
function removeProject(name) {
  const initialLength = config.projects.length;
  const projectToRemove = config.projects.find(p => p.name === name);
  
  if (projectToRemove) {
    // Remove from main projects list
    config.projects = config.projects.filter(p => p.name !== name);
    
    // Remove from company list if applicable
    if (projectToRemove.company) {
      const company = projectToRemove.company;
      if (config.companies[company]) {
        config.companies[company] = config.companies[company].filter(p => p !== name);
        
        // Clean up empty company entries
        if (config.companies[company].length === 0) {
          delete config.companies[company];
        }
      }
    }
    
    console.log(chalk.green(`Removed project: ${name}`));
    saveConfig();
  } else {
    console.log(chalk.yellow(`Project not found: ${name}`));
  }
}

// List all projects
function listProjects(companyFilter = null) {
  if (config.projects.length === 0) {
    console.log(chalk.yellow('No projects configured. Add one using: project-opener add <name> <path>'));
    return;
  }
  
  // Filter projects by company if specified
  let projectsToShow = config.projects;
  if (companyFilter) {
    projectsToShow = config.projects.filter(p => p.company === companyFilter);
    if (projectsToShow.length === 0) {
      console.log(chalk.yellow(`No projects found for company: ${companyFilter}`));
      return;
    }
  }
  
  // Group projects by company
  const groupedProjects = {};
  projectsToShow.forEach(project => {
    const company = project.company || 'No Company';
    if (!groupedProjects[company]) {
      groupedProjects[company] = [];
    }
    groupedProjects[company].push(project);
  });
  
  console.log(chalk.bold('\nConfigured Projects:'));
  console.log(chalk.dim('-------------------'));
  
  // Display projects grouped by company
  Object.keys(groupedProjects).sort().forEach(company => {
    console.log(chalk.cyan(`\n${company}:`));
    
    groupedProjects[company].forEach((project, index) => {
      console.log(`  ${chalk.green(project.name)}`);
      console.log(`    ${chalk.dim(`Path: ${project.path}`)}`);
    });
  });
  
  console.log('\n');
}

// List all companies
function listCompanies() {
  const companies = Object.keys(config.companies);
  
  if (companies.length === 0) {
    console.log(chalk.yellow('No companies configured.'));
    return;
  }
  
  console.log(chalk.bold('\nCompanies:'));
  console.log(chalk.dim('----------'));
  
  companies.sort().forEach((company, index) => {
    const projectCount = config.companies[company].length;
    console.log(`${chalk.cyan(company)} ${chalk.dim(`(${projectCount} projects)`)}`);
  });
  
  console.log('\n');
}

// Search for projects
function searchProjects(query, companyFilter = null) {
  query = query.toLowerCase();
  
  let projectsToSearch = config.projects;
  
  // Filter by company if specified
  if (companyFilter) {
    projectsToSearch = projectsToSearch.filter(p => p.company === companyFilter);
  }
  
  const matches = projectsToSearch.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.path.toLowerCase().includes(query) ||
    (p.company && p.company.toLowerCase().includes(query))
  );
  
  return matches;
}

// Open a project in VSCode
function openProject(project) {
  const command = `${config.vscodeCommand} "${project.path}"`;
  
  console.log(chalk.dim(`Running: ${command}`));
  
  exec(command, (error) => {
    if (error) {
      console.error(chalk.red(`Error opening project:`), error.message);
      return;
    }
    console.log(chalk.green(`Opening project: ${project.name}`));
  });
}

// Set VSCode command
function setVSCodeCommand(command) {
  config.vscodeCommand = command;
  console.log(chalk.green(`VSCode command set to: ${command}`));
  saveConfig();
}

// Set projects base path
function setProjectsBasePath(basePath) {
  const absolutePath = resolvePathToAbsolute(basePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(chalk.red(`Path does not exist: ${absolutePath}`));
    return;
  }
  
  config.projectsBasePath = absolutePath;
  console.log(chalk.green(`Projects base path set to: ${absolutePath}`));
  saveConfig();
}

// Scan a directory for projects (containing .git, package.json, etc.)
function scanForProjects(directoryPath = config.projectsBasePath, company = null) {
  const absolutePath = resolvePathToAbsolute(directoryPath);
  
  console.log(chalk.cyan(`Scanning ${absolutePath} for projects...`));
  
  try {
    const projectIndicators = ['.git', 'package.json', 'composer.json', '.vscode', 'pom.xml', 'Cargo.toml', 'go.mod'];
    const dirs = fs.readdirSync(absolutePath, { withFileTypes: true });
    
    const foundProjects = [];
    
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const fullPath = path.join(absolutePath, dir.name);
        
        // Check if this directory has any project indicators
        const hasIndicator = projectIndicators.some(indicator => 
          fs.existsSync(path.join(fullPath, indicator))
        );
        
        if (hasIndicator) {
          foundProjects.push({
            name: dir.name,
            path: fullPath
          });
        }
      }
    }
    
    if (foundProjects.length === 0) {
      console.log(chalk.yellow('No projects found in the specified directory.'));
      return;
    }
    
    console.log(chalk.green(`Found ${foundProjects.length} projects:`));
    
    // Prompt user to select which projects to add
    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'selectedProjects',
          message: 'Select projects to add:',
          choices: foundProjects.map(p => ({
            name: `${p.name} (${p.path})`,
            value: p,
            checked: true
          }))
        },
        {
          type: 'input',
          name: 'company',
          message: 'Company name (optional):',
          default: company || '',
          when: !company // Only ask if company not provided as argument
        }
      ])
      .then(answers => {
        const selectedCompany = company || answers.company;
        
        if (answers.selectedProjects.length === 0) {
          console.log(chalk.yellow('No projects selected.'));
          return;
        }
        
        answers.selectedProjects.forEach(project => {
          addProject(project.name, project.path, selectedCompany || null);
        });
        
        console.log(chalk.green('Scan complete!'));
      });
  } catch (error) {
    console.error(chalk.red('Error scanning for projects:'), error.message);
  }
}

// Interactive search mode with fuzzy finding
function interactiveSearch() {
  if (config.projects.length === 0) {
    console.log(chalk.yellow('No projects configured. Add one using: project-opener add <name> <path>'));
    return;
  }

  // First, prompt for company filter (optional)
  const companies = Object.keys(config.companies);
  companies.unshift('All Companies');
  
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'companyFilter',
        message: 'Filter by company:',
        choices: companies,
        default: 'All Companies'
      }
    ])
    .then(companyAnswer => {
      const companyFilter = companyAnswer.companyFilter === 'All Companies' ? null : companyAnswer.companyFilter;
      
      // Get projects based on company filter
      let projectsToSearch = config.projects;
      if (companyFilter) {
        projectsToSearch = projectsToSearch.filter(p => p.company === companyFilter);
      }
      
      // Function for fuzzy search
      const searchProjects = (answers, input = '') => {
        input = input || '';
        return new Promise(resolve => {
          const fuzzyResult = fuzzy.filter(input, projectsToSearch, {
            extract: el => el.name
          });
          
          resolve(
            fuzzyResult.map(el => ({
              name: `${el.original.name} ${el.original.company ? chalk.dim(`(${el.original.company})`) : ''}`,
              value: el.original
            }))
          );
        });
      };
      
      // Now prompt for project selection with fuzzy search
      inquirer
        .prompt([
          {
            type: 'autocomplete',
            name: 'project',
            message: 'Search for a project:',
            source: searchProjects
          }
        ])
        .then(answers => {
          if (answers.project) {
            openProject(answers.project);
          }
        });
    });
}

// Initialize CLI
function initCLI() {
  loadConfig();
  
  program
    .name('project-opener')
    .description('Quickly find and open projects in VSCode')
    .version('1.0.0');
  
  // Add command
  program
    .command('add <name> <path>')
    .description('Add a new project')
    .option('-c, --company <company>', 'Assign to a company')
    .action((name, projectPath, options) => {
      addProject(name, projectPath, options.company);
    });
  
  // Remove command
  program
    .command('remove <name>')
    .description('Remove a project')
    .action((name) => {
      removeProject(name);
    });
  
  // List command
  program
    .command('list')
    .description('List all configured projects')
    .option('-c, --company <company>', 'Filter by company')
    .action((options) => {
      listProjects(options.company);
    });
  
  // Companies command
  program
    .command('companies')
    .description('List all companies')
    .action(() => {
      listCompanies();
    });
  
  // Search command
  program
    .command('search <query>')
    .description('Search for a project matching the query')
    .option('-c, --company <company>', 'Filter by company')
    .action((query, options) => {
      const results = searchProjects(query, options.company);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No matching projects found.'));
      } else if (results.length === 1) {
        console.log(chalk.green(`Found one match: ${results[0].name}`));
        
        // Automatically open the project if it's the only match
        inquirer
          .prompt([
            {
              type: 'confirm',
              name: 'open',
              message: 'Open this project?',
              default: true
            }
          ])
          .then(answers => {
            if (answers.open) {
              openProject(results[0]);
            }
          });
      } else {
        console.log(chalk.green(`Found ${results.length} matches:`));
        
        // Format choices with company information if available
        const choices = results.map((project, index) => ({
          name: `${project.name} ${project.company ? chalk.dim(`(${project.company})`) : ''}`,
          value: index
        }));
        
        inquirer
          .prompt([
            {
              type: 'list',
              name: 'projectIndex',
              message: 'Select a project to open:',
              choices: choices
            }
          ])
          .then(answers => {
            openProject(results[answers.projectIndex]);
          });
      }
    });
  
  // Open command
  program
    .command('open <name>')
    .description('Open a project directly by name')
    .action((name) => {
      const project = config.projects.find(p => p.name === name);
      
      if (project) {
        openProject(project);
      } else {
        console.log(chalk.yellow(`Project not found: ${name}`));
      }
    });
  
  // Set VSCode command
  program
    .command('set-vscode-cmd <command>')
    .description('Set the VSCode command')
    .action((command) => {
      setVSCodeCommand(command);
    });
  
  // Set base path
  program
    .command('set-base-path <path>')
    .description('Set the base path for projects')
    .action((basePath) => {
      setProjectsBasePath(basePath);
    });
  
  // Scan command
  program
    .command('scan [directory]')
    .description('Scan a directory for projects')
    .option('-c, --company <company>', 'Assign found projects to a company')
    .action((directory, options) => {
      scanForProjects(directory || config.projectsBasePath, options.company);
    });
  
  // Go command
  program
    .command('go <name>')
    .description('Get the path to a project (for cd command)')
    .action((name) => {
      const project = config.projects.find(p => p.name === name);
      
      if (project) {
        // Output only the path, no extra text, so it can be used with cd
        console.log(project.path);
      } else {
        // Write error to stderr so stdout remains clean for shell usage
        console.error(chalk.red(`Project not found: ${name}`));
        process.exit(1);
      }
    });

  // Interactive command
  program
    .command('interactive')
    .alias('i')
    .description('Enter interactive search mode')
    .action(() => {
      interactiveSearch();
    });
  
  // Default command (no arguments)
  program
    .action(() => {
      // If no command is specified, run interactive mode
      if (process.argv.length <= 2) {
        interactiveSearch();
      }
    });
  
  program.parse();
}

// Start the CLI
initCLI();